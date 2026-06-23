from typing import Optional
from fastapi import APIRouter, Depends

from app.models.role_config import RoleConfig
from app.schemas.role_config import RoleConfigCreate, RoleConfigUpdate, RoleConfigResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.role_config_service import RoleConfigService

router = APIRouter(prefix="/system/roles", tags=["system"])


@router.get("")
async def list_role_configs(
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = RoleConfigService(uow)
    configs = await service.list_all()
    return success_response(
        data=[RoleConfigResponse.model_validate(c).model_dump() for c in configs],
        message="Список ролей",
    )


@router.post("")
async def create_role_config(
    data: RoleConfigCreate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = RoleConfigService(uow)
    existing = await service.get_by_role(data.role)
    if existing:
        return error_response("Роль с таким кодом уже существует", status_code=409)
    config = await service.create(data.model_dump())
    await uow.commit()
    return success_response(
        data=RoleConfigResponse.model_validate(config).model_dump(),
        message="Роль создана",
        status_code=201,
    )


@router.get("/{role}")
async def get_role_config(
    role: str,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = RoleConfigService(uow)
    config = await service.get_by_role(role)
    if not config:
        return error_response("Роль не найдена", status_code=404)
    return success_response(data=RoleConfigResponse.model_validate(config).model_dump())


@router.patch("/{role}")
async def update_role_config(
    role: str,
    data: RoleConfigUpdate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = RoleConfigService(uow)
    config = await service.get_by_role(role)
    if not config:
        return error_response("Роль не найдена", status_code=404)
    updated = await service.update(config, data.model_dump(exclude_unset=True))
    await uow.commit()
    return success_response(data=RoleConfigResponse.model_validate(updated).model_dump(), message="Роль обновлена")


@router.delete("/{role}")
async def delete_role_config(
    role: str,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = RoleConfigService(uow)
    config = await service.get_by_role(role)
    if not config:
        return error_response("Роль не найдена", status_code=404)
    await service.delete(config)
    await uow.commit()
    return success_response(message="Роль удалена")
