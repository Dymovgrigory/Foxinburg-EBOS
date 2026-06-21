from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.course import LessonCreate, LessonUpdate, LessonResponse
from app.schemas.progress import LessonProgressResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.lesson_service import LessonService
from app.services.module_service import ModuleService
from app.services.progress_service import ProgressService

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/{lesson_id}")
async def get_lesson(
    lesson_id: int,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    lesson = await service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)
    return success_response(
        data=LessonResponse.model_validate(lesson).model_dump(),
        message="Урок",
    )


@router.post("")
async def create_lesson(
    data: LessonCreate,
    current_user=Depends(require_permission(Permission.LESSON_CREATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    module_service = ModuleService(uow)
    module = await module_service.get_by_id(data.module_id)
    if not module:
        return error_response("Модуль не найден", status_code=404)

    service = LessonService(uow)
    lesson = await service.create_lesson(
        module_id=data.module_id,
        title=data.title,
        description=data.description,
        lesson_type=data.lesson_type,
        order_index=data.order_index,
        duration_minutes=data.duration_minutes,
    )
    return success_response(
        data=LessonResponse.model_validate(lesson).model_dump(),
        message="Урок создан",
        status_code=201,
    )


@router.patch("/{lesson_id}")
async def update_lesson(
    lesson_id: int,
    data: LessonUpdate,
    current_user=Depends(require_permission(Permission.LESSON_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    lesson = await service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)

    updated = await service.update_lesson(
        lesson,
        title=data.title,
        description=data.description,
        lesson_type=data.lesson_type,
        order_index=data.order_index,
        duration_minutes=data.duration_minutes,
        is_active=data.is_active,
    )
    return success_response(
        data=LessonResponse.model_validate(updated).model_dump(),
        message="Урок обновлён",
    )


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_user=Depends(require_permission(Permission.LESSON_DELETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = LessonService(uow)
    lesson = await service.get_by_id(lesson_id)
    if not lesson:
        return error_response("Урок не найден", status_code=404)

    await service.delete_lesson(lesson)
    return success_response(message="Урок удалён")


@router.post("/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: int,
    current_user=Depends(require_permission(Permission.LESSON_COMPLETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ProgressService(uow)
    try:
        progress = await service.complete_lesson(current_user.id, lesson_id)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    return success_response(
        data=LessonProgressResponse.model_validate(progress).model_dump(),
        message="Урок завершён",
    )
