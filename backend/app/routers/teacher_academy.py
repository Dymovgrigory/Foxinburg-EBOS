from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse, HTMLResponse, Response
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
    AcademyGroupEnrollRequest,
    AcademyModuleCompleteResponse,
    AcademyProgressResponse,
)
from app.schemas.enrollment import EnrollmentResponse
from app.services.teacher_academy_service import TeacherAcademyService
from app.services.employee_group_service import EmployeeGroupService
from app.services.enrollment_service import EnrollmentService
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.office_converter import convert_office_to_pdf
from app.services.yandex_disk_service import YandexDiskService
from app.services.audit_service import AuditService
from app.services.content_token_service import (
    create_content_token,
    validate_content_token,
    ContentTokenError,
)
from app.services.rate_limit_service import (
    check_content_token_rate_limit,
    check_content_stream_rate_limit,
    check_content_id_enumeration_rate_limit,
    RateLimitExceeded,
)
from app.services.watermark_service import (
    apply_text_watermark_to_pdf,
    get_watermark_text,
)

router = APIRouter(prefix="/teacher-academy", tags=["teacher-academy"])

_PREVIEW_ROLES = ("methodist", "admin", "owner", "super_admin")
_ALLOWED_ENROLLMENT_STATUSES = ("active", "completed")


async def _load_content(uow: UnitOfWork, content_id: int) -> Optional[LessonContent]:
    result = await uow.session.execute(
        select(LessonContent)
        .where(LessonContent.id == content_id)
        .options(selectinload(LessonContent.lesson).selectinload(Lesson.module).selectinload(Module.course))
    )
    return result.scalar_one_or_none()


async def _resolve_disk_path(content: LessonContent) -> Optional[str]:
    disk_path = content.yandex_disk_path
    if disk_path:
        return disk_path
    if content.title and content.lesson and content.lesson.module:
        try:
            disk = YandexDiskService()
            disk_path = await disk.find_file_path(content.lesson.module.title, content.title)
            if disk_path:
                content.yandex_disk_path = disk_path
                return disk_path
        except Exception:
            pass
    return None


async def _check_content_access(user: User, content: LessonContent, uow: UnitOfWork) -> bool:
    if not content.lesson or not content.lesson.module or not content.lesson.module.course:
        return False
    if user.role in _PREVIEW_ROLES:
        return True
    enrollment_result = await uow.session.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == content.lesson.module.course.id,
            Enrollment.status.in_(_ALLOWED_ENROLLMENT_STATUSES),
        )
    )
    return enrollment_result.scalar_one_or_none() is not None


async def _require_content_token_user(
    content_id: int,
    content_token: Optional[str] = Query(default=None, alias="content_token"),
    uow: UnitOfWork = Depends(get_uow),
) -> User:
    if not content_token:
        raise HTTPException(status_code=403, detail="Отсутствует токен доступа к материалу")
    try:
        token_content_id, user_id = await validate_content_token(content_token)
    except ContentTokenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if token_content_id != content_id:
        raise HTTPException(status_code=403, detail="Токен не соответствует материалу")
    user = await uow.session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Пользователь не найден или неактивен")
    return user


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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


@router.post("/enroll-group")
async def enroll_teacher_group(
    data: AcademyGroupEnrollRequest,
    current_user: User = Depends(require_permission(Permission.ENROLLMENT_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    academy_service = TeacherAcademyService(uow)
    course = await academy_service.get_academy_course()
    if not course:
        return error_response("Курс Академии педагогов не найден", status_code=404)

    group_service = EmployeeGroupService(uow)
    group = await group_service.get_by_id(data.group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)

    enrollment_service = EnrollmentService(uow)
    try:
        enrollments = await enrollment_service.enroll_employee_group(
            group=group,
            course_id=course.id,
            current_user=current_user,
        )
    except ValueError as e:
        return error_response(str(e), status_code=400)

    await uow.commit()
    return success_response(
        data={"enrolled_count": len(enrollments)},
        message=f"Зачислено {len(enrollments)} участников группы на Академию",
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
        lessons = sorted(module.lessons, key=lambda l: l.order_index)
        lesson_ids = [lesson.id for lesson in lessons]

        progresses: dict[int, LessonProgress] = {}
        if lesson_ids:
            progress_result = await uow.session.execute(
                select(LessonProgress).where(
                    LessonProgress.student_id == current_user.id,
                    LessonProgress.lesson_id.in_(lesson_ids),
                )
            )
            progresses = {p.lesson_id: p for p in progress_result.scalars().all()}

        if not lessons:
            status = "locked"
        else:
            statuses = [progresses.get(lesson.id).status if progresses.get(lesson.id) else "locked" for lesson in lessons]
            if all(s == "completed" for s in statuses):
                status = "completed"
            else:
                first_open = next((s for s in statuses if s != "completed"), statuses[-1])
                if first_open == "locked":
                    status = "locked"
                elif any(s == "completed" for s in statuses):
                    status = "in_progress"
                else:
                    status = first_open

        modules_data.append(
            {
                "id": module.id,
                "title": module.title,
                "order_index": module.order_index,
                "status": status,
                "lesson_id": lessons[0].id if lessons else None,
            }
        )

    data = AcademyProgressResponse(
        enrollment_id=enrollment.id,
        status=enrollment.status,
        progress_percent=enrollment.progress_percent,
        assigned_at=enrollment.assigned_at,
        enrolled_at=enrollment.enrolled_at,
        completed_at=enrollment.completed_at,
        is_certified=enrollment.status == "completed",
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


@router.get("/certificate", response_class=HTMLResponse)
async def get_certificate(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Возвращает HTML-сертификат об окончании Академии педагогов."""
    service = TeacherAcademyService(uow)
    try:
        enrollment = await service.ensure_teacher_enrolled(current_user.id, current_user.id)
    except ValueError as e:
        return error_response(str(e), status_code=400)

    if enrollment.status != "completed":
        return error_response("Сертификат доступен только после завершения Академии", status_code=403)

    completed_at = enrollment.completed_at.isoformat() if enrollment.completed_at else ""
    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Сертификат — {current_user.name or current_user.email}</title>
  <style>
    body {{ margin: 0; padding: 0; font-family: Georgia, serif; background: #f8f9fb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }}
    .certificate {{ width: 800px; background: #fff; border: 12px solid #5b4cff; padding: 60px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }}
    h1 {{ color: #5b4cff; font-size: 42px; margin-bottom: 10px; }}
    h2 {{ color: #333; font-size: 28px; margin: 30px 0 10px; }}
    p {{ color: #555; font-size: 18px; line-height: 1.6; }}
    .date {{ margin-top: 40px; color: #777; font-size: 16px; }}
    .print {{ margin-top: 30px; }}
    button {{ background: #5b4cff; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; }}
    @media print {{ .print {{ display: none; }} body {{ background: #fff; }} .certificate {{ box-shadow: none; border: 6px solid #5b4cff; }} }}
  </style>
</head>
<body>
  <div class="certificate">
    <h1>FOXINBURG EBOS</h1>
    <p>Сертификат подтверждает, что</p>
    <h2>{current_user.name or current_user.email}</h2>
    <p>успешно завершил(а) обучение в<br><strong>Академии педагогов FOXINBURG</strong>.</p>
    <div class="date">Дата выдачи: {completed_at[:10] if completed_at else '—'}</div>
    <div class="print"><button onclick="window.print()">Печать / Сохранить как PDF</button></div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.post("/contents/{content_id}/token")
async def create_content_token_endpoint(
    content_id: int,
    request: Request,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Выдаёт короткоживущий токен для доступа к материалу Академии."""
    ip_address = _get_client_ip(request)

    content = await _load_content(uow, content_id)
    if not content:
        try:
            await check_content_id_enumeration_rate_limit(ip_address)
        except RateLimitExceeded as exc:
            return error_response(str(exc), status_code=429)
        await AuditService.log_action(
            uow,
            action="CONTENT_TOKEN_DENIED",
            entity_type="lesson_content",
            entity_id=content_id,
            user_id=current_user.id,
            ip_address=ip_address,
            new_values={"reason": "content_not_found"},
        )
        await uow.commit()
        return error_response("Материал не найден", status_code=404)

    if not await _check_content_access(current_user, content, uow):
        try:
            await check_content_id_enumeration_rate_limit(ip_address)
        except RateLimitExceeded as exc:
            return error_response(str(exc), status_code=429)
        await AuditService.log_action(
            uow,
            action="CONTENT_TOKEN_DENIED",
            entity_type="lesson_content",
            entity_id=content_id,
            user_id=current_user.id,
            ip_address=ip_address,
            new_values={"reason": "access_denied"},
        )
        await uow.commit()
        return error_response("Доступ к материалу запрещён", status_code=403)

    try:
        await check_content_token_rate_limit(current_user.id)
    except RateLimitExceeded as exc:
        return error_response(str(exc), status_code=429)

    token = await create_content_token(content_id=content_id, user_id=current_user.id)

    await AuditService.log_action(
        uow,
        action="CONTENT_TOKEN_CREATED",
        entity_type="lesson_content",
        entity_id=content_id,
        user_id=current_user.id,
        ip_address=ip_address,
    )
    await uow.commit()

    return success_response(
        data={"token": token, "expires_in": 600},
        message="Токен доступа к материалу выдан",
    )


@router.get("/contents/{content_id}/stream")
async def stream_content(
    content_id: int,
    request: Request,
    current_user: User = Depends(_require_content_token_user),
    uow: UnitOfWork = Depends(get_uow),
    range: Optional[str] = Header(None),
):
    """Защищённая прокси-отдача файла материала Академии педагогов.

    Доступ возможен только по короткоживущему content-токену, выданному
    на материал и пользователя. Прямые ссылки Яндекс.Диска не раскрываются.
    """
    ip_address = _get_client_ip(request)

    content = await _load_content(uow, content_id)
    if not content:
        await AuditService.log_action(
            uow,
            action="CONTENT_STREAM_DENIED",
            entity_type="lesson_content",
            entity_id=content_id,
            user_id=current_user.id,
            ip_address=ip_address,
            new_values={"reason": "content_not_found"},
        )
        await uow.commit()
        return error_response("Материал не найден", status_code=404)

    if not await _check_content_access(current_user, content, uow):
        await AuditService.log_action(
            uow,
            action="CONTENT_STREAM_DENIED",
            entity_type="lesson_content",
            entity_id=content_id,
            user_id=current_user.id,
            ip_address=ip_address,
            new_values={"reason": "access_denied"},
        )
        await uow.commit()
        return error_response("Доступ к материалу запрещён", status_code=403)

    disk_path = await _resolve_disk_path(content)
    if not disk_path:
        return error_response("Файл недоступен для потоковой передачи", status_code=404)

    try:
        disk = YandexDiskService()
        download_url = await disk.get_download_url(disk_path)
    except Exception as e:
        return error_response(f"Не удалось получить файл с Яндекс.Диска: {e}", status_code=502)

    if not download_url:
        return error_response("Файл не найден на Яндекс.Диске", status_code=404)

    try:
        await check_content_stream_rate_limit(
            current_user.id,
            content_id,
            content_length=content.file_size,
        )
    except RateLimitExceeded as exc:
        return error_response(str(exc), status_code=429)

    request_headers = {}
    if range:
        request_headers["Range"] = range

    client = httpx.AsyncClient(timeout=120.0, follow_redirects=True)
    upstream = client.build_request("GET", download_url, headers=request_headers)
    response = await client.send(upstream, stream=True)

    pass_through_headers = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]
    response_headers = {
        key: value
        for key, value in response.headers.items()
        if key.lower() in pass_through_headers
    }
    response_headers["Content-Disposition"] = "inline"
    response_headers["X-Content-Type-Options"] = "nosniff"
    response_headers["X-Frame-Options"] = "DENY"
    response_headers["Referrer-Policy"] = "no-referrer"

    await AuditService.log_action(
        uow,
        action="CONTENT_STREAMED",
        entity_type="lesson_content",
        entity_id=content_id,
        user_id=current_user.id,
        ip_address=ip_address,
        new_values={"range": range, "content_type": content.content_type},
    )
    await uow.commit()

    async def stream():
        try:
            async for chunk in response.aiter_raw():
                yield chunk
        finally:
            await response.aclose()
            await client.aclose()

    return StreamingResponse(
        stream(),
        status_code=response.status_code,
        headers=response_headers,
        media_type=response.headers.get("Content-Type", "application/octet-stream"),
    )


@router.get("/contents/{content_id}/pdf")
async def stream_content_pdf(
    content_id: int,
    request: Request,
    current_user: User = Depends(_require_content_token_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Конвертирует Office-файл материала в PDF и отдаёт его с персональным watermark.

    Доступ возможен только по короткоживущему content-токену.
    """
    ip_address = _get_client_ip(request)

    content = await _load_content(uow, content_id)
    if not content:
        await AuditService.log_action(
            uow,
            action="CONTENT_PDF_DENIED",
            entity_type="lesson_content",
            entity_id=content_id,
            user_id=current_user.id,
            ip_address=ip_address,
            new_values={"reason": "content_not_found"},
        )
        await uow.commit()
        return error_response("Материал не найден", status_code=404)

    if not await _check_content_access(current_user, content, uow):
        await AuditService.log_action(
            uow,
            action="CONTENT_PDF_DENIED",
            entity_type="lesson_content",
            entity_id=content_id,
            user_id=current_user.id,
            ip_address=ip_address,
            new_values={"reason": "access_denied"},
        )
        await uow.commit()
        return error_response("Доступ к материалу запрещён", status_code=403)

    disk_path = await _resolve_disk_path(content)
    if not disk_path:
        return error_response("Файл недоступен для конвертации", status_code=404)

    try:
        disk = YandexDiskService()
        download_url = await disk.get_download_url(disk_path)
    except Exception as e:
        return error_response(f"Не удалось получить файл с Яндекс.Диска: {e}", status_code=502)

    if not download_url:
        return error_response("Файл не найден на Яндекс.Диске", status_code=404)

    try:
        await check_content_stream_rate_limit(
            current_user.id,
            content_id,
            content_length=content.file_size,
        )
    except RateLimitExceeded as exc:
        return error_response(str(exc), status_code=429)

    try:
        pdf_path = await convert_office_to_pdf(
            content_id=content.id,
            source_url=download_url,
            source_md5=content.yandex_disk_md5,
            source_name=content.title,
        )
        pdf_bytes = pdf_path.read_bytes()
    except RuntimeError as e:
        return error_response(str(e), status_code=503)
    except Exception as e:
        return error_response(f"Ошибка конвертации в PDF: {e}", status_code=502)

    watermark_text = get_watermark_text(
        user_email=current_user.email,
        user_id=current_user.id,
        user_name=current_user.name,
    )
    watermarked_bytes = apply_text_watermark_to_pdf(
        pdf_bytes,
        watermark_text,
        content_id=content.id,
        user_id=current_user.id,
        file_md5=content.yandex_disk_md5 or "",
    )

    await AuditService.log_action(
        uow,
        action="CONTENT_PDF_VIEWED",
        entity_type="lesson_content",
        entity_id=content_id,
        user_id=current_user.id,
        ip_address=ip_address,
        new_values={"watermarked": True},
    )
    await uow.commit()

    return Response(
        content=watermarked_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{content.title}.pdf"',
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
        },
    )


@router.get("/access-log")
async def access_log(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_permission(Permission.USER_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    """История обращений к защищённым материалам Академии (admin/methodist/owner)."""
    from app.models.event import AuditLog

    result = await uow.session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "lesson_content")
        .where(AuditLog.action.in_([
            "CONTENT_TOKEN_CREATED",
            "CONTENT_STREAMED",
            "CONTENT_PDF_VIEWED",
            "CONTENT_TOKEN_DENIED",
            "CONTENT_STREAM_DENIED",
            "CONTENT_PDF_DENIED",
        ]))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    logs = result.scalars().all()
    return success_response(
        data=[
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "content_id": log.entity_id,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "details": log.new_values,
            }
            for log in logs
        ],
        message="История доступа к материалам",
    )
