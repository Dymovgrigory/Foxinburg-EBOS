from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import (
    require_active_user,
    require_active_user_from_header_or_query,
    require_permission,
)
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.models.course import Course, LessonContent, Module, Lesson
from app.models.enrollment import Enrollment, LessonProgress
from app.models.user import User
from app.schemas.academy import (
    AcademyCourseResponse,
    AcademyEnrollmentRequest,
    AcademyModuleCompleteResponse,
    AcademyProgressResponse,
)
from app.schemas.enrollment import EnrollmentResponse
from app.services.teacher_academy_service import TeacherAcademyService
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.office_converter import convert_office_to_pdf
from app.services.yandex_disk_service import YandexDiskService

router = APIRouter(prefix="/teacher-academy", tags=["teacher-academy"])


@router.post("/sync")
async def sync_academy(
    current_user: User = Depends(require_permission(Permission.COURSE_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TeacherAcademyService(uow)
    try:
        course = await service.sync_from_yandex_disk()
    except ValueError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        return error_response(f"Ошибка синхронизации с Яндекс.Диском: {e}", status_code=502)

    return success_response(
        data=AcademyCourseResponse.model_validate(course).model_dump(),
        message="Академия педагогов синхронизирована с Яндекс.Диском",
    )


@router.get("/course")
async def get_academy_course(
    current_user: User = Depends(require_active_user_from_header_or_query),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TeacherAcademyService(uow)
    course = await service.get_academy_course()
    if not course:
        return error_response("Курс Академии педагогов не найден", status_code=404)
    return success_response(
        data=AcademyCourseResponse.model_validate(course).model_dump(),
        message="Курс Академии педагогов",
    )


@router.post("/enroll")
async def enroll_teacher(
    data: AcademyEnrollmentRequest,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    if current_user.role not in ("teacher", "methodist", "admin", "owner", "super_admin"):
        return error_response("Недостаточно прав доступа", status_code=403)
    # Методисты/админы могут зачислять других; учителя — только себя
    if current_user.role == "teacher" and data.student_id != current_user.id:
        return error_response("Учитель может зачислить только себя", status_code=403)

    service = TeacherAcademyService(uow)
    try:
        enrollment = await service.enroll_teacher(data.student_id, current_user.id)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    return success_response(
        data=EnrollmentResponse.model_validate(enrollment).model_dump(),
        message="Педагог зачислен на Академию",
        status_code=201,
    )


@router.get("/progress")
async def get_my_progress(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TeacherAcademyService(uow)
    try:
        enrollment = await service.ensure_teacher_enrolled(current_user.id, current_user.id)
    except ValueError as e:
        return error_response(str(e), status_code=400)

    modules_data = []
    for module in sorted(enrollment.course.modules, key=lambda m: m.order_index):
        lesson = module.lessons[0] if module.lessons else None
        status = "locked"
        if lesson:
            progress_result = await uow.session.execute(
                select(LessonProgress).where(
                    LessonProgress.student_id == current_user.id,
                    LessonProgress.lesson_id == lesson.id,
                )
            )
            progress = progress_result.scalar_one_or_none()
            status = progress.status if progress else "locked"
        modules_data.append(
            {
                "id": module.id,
                "title": module.title,
                "order_index": module.order_index,
                "status": status,
                "lesson_id": lesson.id if lesson else None,
            }
        )

    data = AcademyProgressResponse(
        enrollment_id=enrollment.id,
        status=enrollment.status,
        progress_percent=enrollment.progress_percent,
        assigned_at=enrollment.assigned_at,
        enrolled_at=enrollment.enrolled_at,
        completed_at=enrollment.completed_at,
        modules=modules_data,
    )
    return success_response(data=data.model_dump(), message="Прогресс по Академии")


@router.post("/modules/{module_id}/complete")
async def complete_module(
    module_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TeacherAcademyService(uow)
    try:
        await service.ensure_teacher_enrolled(current_user.id, current_user.id)
        progress = await service.complete_module(current_user.id, module_id)
    except ValueError as e:
        return error_response(str(e), status_code=400)

    enrollment_result = await uow.session.execute(
        select(Enrollment).where(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == progress.lesson.module.course_id,
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()

    return success_response(
        data=AcademyModuleCompleteResponse(
            module_id=module_id,
            lesson_id=progress.lesson_id,
            status=progress.status,
            progress_percent=enrollment.progress_percent if enrollment else 0,
            message="Модуль завершён",
        ).model_dump(),
        message="Модуль завершён",
    )


@router.get("/contents/{content_id}/stream")
async def stream_content(
    content_id: int,
    current_user: User = Depends(require_active_user_from_header_or_query),
    uow: UnitOfWork = Depends(get_uow),
    range: Optional[str] = Header(None),
):
    """Защищённая прокси-отдача файла материала Академии педагогов.

    Проверяет права пользователя, получает свежую прямую ссылку с Яндекс.Диска
    и проксирует поток через бэкенд, чтобы не раскрывать внешние URL.
    """
    content_result = await uow.session.execute(
        select(LessonContent)
        .where(LessonContent.id == content_id)
        .options(selectinload(LessonContent.lesson).selectinload(Lesson.module).selectinload(Module.course))
    )
    content = content_result.scalar_one_or_none()
    if not content:
        return error_response("Материал не найден", status_code=404)

    disk_path = content.yandex_disk_path
    if not disk_path and content.title and content.lesson and content.lesson.module:
        # Fallback: ищем файл по названию модуля и названию файла
        try:
            disk = YandexDiskService()
            disk_path = await disk.find_file_path(content.lesson.module.title, content.title)
            if disk_path:
                content.yandex_disk_path = disk_path
        except Exception:
            pass

    if not disk_path:
        return error_response("Файл недоступен для потоковой передачи", status_code=404)

    course = content.lesson.module.course

    # Методисты и администраторы могут просматривать без зачисления
    can_preview = current_user.role in ("methodist", "admin", "owner", "super_admin")
    if not can_preview:
        enrollment_result = await uow.session.execute(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == "active",
            )
        )
        if not enrollment_result.scalar_one_or_none():
            return error_response("Доступ к материалу запрещён", status_code=403)

    try:
        disk = YandexDiskService()
        download_url = await disk.get_download_url(disk_path)
    except Exception as e:
        return error_response(f"Не удалось получить файл с Яндекс.Диска: {e}", status_code=502)

    if not download_url:
        return error_response("Файл не найден на Яндекс.Диске", status_code=404)

    headers = {}
    if range:
        headers["Range"] = range

    async def stream():
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            async with client.stream("GET", download_url, headers=headers) as response:
                async for chunk in response.aiter_raw():
                    yield chunk

    response_headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
    }

    # Проксируем content-type и длину, если они есть
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as head_client:
        head_response = await head_client.head(download_url)
        if head_response.status_code < 400:
            if head_response.headers.get("content-type"):
                response_headers["Content-Type"] = head_response.headers["content-type"]
            if head_response.headers.get("content-length"):
                response_headers["Content-Length"] = head_response.headers["content-length"]

    status_code = 206 if range else 200
    return StreamingResponse(
        stream(),
        status_code=status_code,
        headers=response_headers,
        media_type=response_headers.get("Content-Type", "application/octet-stream"),
    )


@router.get("/contents/{content_id}/pdf")
async def stream_content_pdf(
    content_id: int,
    current_user: User = Depends(require_active_user_from_header_or_query),
    uow: UnitOfWork = Depends(get_uow),
):
    """Конвертирует Office-файл материала в PDF и отдаёт его защищённым потоком.

    Требует тех же прав, что и оригинальный stream-endpoint.
    """
    content_result = await uow.session.execute(
        select(LessonContent)
        .where(LessonContent.id == content_id)
        .options(selectinload(LessonContent.lesson).selectinload(Lesson.module).selectinload(Module.course))
    )
    content = content_result.scalar_one_or_none()
    if not content:
        return error_response("Материал не найден", status_code=404)

    disk_path = content.yandex_disk_path
    if not disk_path and content.title and content.lesson and content.lesson.module:
        try:
            disk = YandexDiskService()
            disk_path = await disk.find_file_path(content.lesson.module.title, content.title)
            if disk_path:
                content.yandex_disk_path = disk_path
        except Exception:
            pass

    if not disk_path:
        return error_response("Файл недоступен для конвертации", status_code=404)

    course = content.lesson.module.course

    can_preview = current_user.role in ("methodist", "admin", "owner", "super_admin")
    if not can_preview:
        enrollment_result = await uow.session.execute(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == "active",
            )
        )
        if not enrollment_result.scalar_one_or_none():
            return error_response("Доступ к материалу запрещён", status_code=403)

    try:
        disk = YandexDiskService()
        download_url = await disk.get_download_url(disk_path)
    except Exception as e:
        return error_response(f"Не удалось получить файл с Яндекс.Диска: {e}", status_code=502)

    if not download_url:
        return error_response("Файл не найден на Яндекс.Диске", status_code=404)

    try:
        pdf_path = await convert_office_to_pdf(
            content_id=content.id,
            source_url=download_url,
            source_md5=content.yandex_disk_md5,
        )
    except RuntimeError as e:
        return error_response(str(e), status_code=503)
    except Exception as e:
        return error_response(f"Ошибка конвертации в PDF: {e}", status_code=502)

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{content.title}.pdf",
        headers={
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
        },
    )
