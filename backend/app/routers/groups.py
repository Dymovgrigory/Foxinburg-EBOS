from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.group_service import GroupService

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("")
async def list_groups(
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    groups = await service.list_groups()
    return success_response(
        data=[GroupResponse.model_validate(g).model_dump() for g in groups],
        message="Список групп",
        meta={"total": len(groups)},
    )


@router.post("")
async def create_group(
    data: GroupCreate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.create_group(
        name=data.name,
        description=data.description,
        branch_id=data.branch_id,
        teacher_id=data.teacher_id,
        course_id=data.course_id,
        max_students=data.max_students,
        schedule=data.schedule,
    )
    return success_response(
        data=GroupResponse.model_validate(group).model_dump(),
        message="Группа создана",
        status_code=201,
    )


@router.get("/{group_id}")
async def get_group(
    group_id: int,
    current_user=Depends(require_permission(Permission.GROUP_READ)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)
    return success_response(
        data=GroupResponse.model_validate(group).model_dump(),
        message="Группа",
    )


@router.patch("/{group_id}")
async def update_group(
    group_id: int,
    data: GroupUpdate,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    await uow.commit()
    await uow.session.refresh(group)
    return success_response(
        data=GroupResponse.model_validate(group).model_dump(),
        message="Группа обновлена",
    )


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    current_user=Depends(require_permission(Permission.GROUP_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = GroupService(uow)
    group = await service.get_by_id(group_id)
    if not group:
        return error_response("Группа не найдена", status_code=404)
    await uow.session.delete(group)
    await uow.commit()
    return success_response(data=None, message="Группа удалена")
