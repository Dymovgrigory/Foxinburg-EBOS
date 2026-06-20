from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import require_active_user, require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.models.course import Course, Module, Lesson
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
    current_user: User = Depends(require_active_user),
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
    current_user: User = Depends(require_permission(Permission.ENROLLMENT_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = TeacherAcademyService(uow)
    try:
        enrollment = await service.enroll_teacher(data.student_id, current_user)
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
    enrollment = await service.get_teacher_progress(current_user.id)
    if not enrollment:
        return error_response("Вы не зачислены на Академию педагогов", status_code=404)

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
