from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.course import ModuleCreate, ModuleResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.module_service import ModuleService
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
