from typing import List
from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.course import ModuleCreate, ModuleUpdate, ModuleResponse, LessonResponse, ModuleReorderRequest
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.module_service import ModuleService
from app.services.lesson_service import LessonService
from app.services.course_service import CourseService

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("/{module_id}")
async def get_module(
    module_id: int,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ModuleService(uow)
    module = await service.get_by_id(module_id)
    if not module:
        return error_response("Модуль не найден", status_code=404)
    return success_response(
        data=ModuleResponse.model_validate(module).model_dump(),
        message="Модуль",
    )


@router.get("/{module_id}/lessons")
async def list_module_lessons(
    module_id: int,
    current_user=Depends(require_permission(Permission.COURSE_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    module_service = ModuleService(uow)
    module = await module_service.get_by_id(module_id)
    if not module:
        return error_response("Модуль не найден", status_code=404)

    lesson_service = LessonService(uow)
    lessons = await lesson_service.list_by_module(module_id)
    return success_response(
        data=[LessonResponse.model_validate(l).model_dump() for l in lessons],
        message="Уроки модуля",
        meta={"total": len(lessons)},
    )


@router.post("")
async def create_module(
    data: ModuleCreate,
    current_user=Depends(require_permission(Permission.MODULE_CREATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    course_service = CourseService(uow)
    course = await course_service.get_by_id(data.course_id)
    if not course:
        return error_response("Курс не найден", status_code=404)

    service = ModuleService(uow)
    module = await service.create_module(
        course_id=data.course_id,
        title=data.title,
        description=data.description,
        order_index=data.order_index,
    )
    return success_response(
        data=ModuleResponse.model_validate(module).model_dump(),
        message="Модуль создан",
        status_code=201,
    )


@router.post("/reorder")
async def reorder_modules(
    data: ModuleReorderRequest,
    current_user=Depends(require_permission(Permission.MODULE_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ModuleService(uow)
    try:
        modules = await service.reorder_modules(data.course_id, data.module_ids)
    except ValueError as e:
        return error_response(str(e), status_code=400)

    return success_response(
        data=[ModuleResponse.model_validate(m).model_dump() for m in modules],
        message="Порядок модулей обновлён",
    )


@router.patch("/{module_id}")
async def update_module(
    module_id: int,
    data: ModuleUpdate,
    current_user=Depends(require_permission(Permission.MODULE_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ModuleService(uow)
    module = await service.get_by_id(module_id)
    if not module:
        return error_response("Модуль не найден", status_code=404)

    updated = await service.update_module(
        module,
        title=data.title,
        description=data.description,
        order_index=data.order_index,
        is_active=data.is_active,
    )
    return success_response(
        data=ModuleResponse.model_validate(updated).model_dump(),
        message="Модуль обновлён",
    )


@router.delete("/{module_id}")
async def delete_module(
    module_id: int,
    current_user=Depends(require_permission(Permission.MODULE_DELETE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ModuleService(uow)
    module = await service.get_by_id(module_id)
    if not module:
        return error_response("Модуль не найден", status_code=404)

    await service.delete_module(module)
    return success_response(message="Модуль удалён")
