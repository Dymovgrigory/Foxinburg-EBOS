from fastapi import APIRouter, Depends, Request

from app.core.dependencies import require_permission
from app.core.permissions import Permission, ROLE_PERMISSIONS, ROLE_HIERARCHY, MODULE_PERMISSIONS
from app.core.responses import success_response, error_response
from app.schemas.system_settings import SystemSettingsOut, SystemSettingsUpdate
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.system_settings_service import SystemSettingsService

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/permissions")
async def list_permissions(
    request: Request,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
):
    app = request.app
    endpoints = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in route.methods:
                if method in ("HEAD", "OPTIONS"):
                    continue
                endpoints.append({"method": method, "path": route.path})

    return success_response(
        data={
            "role_permissions": {
                role.value: [p.value for p in perms]
                for role, perms in ROLE_PERMISSIONS.items()
            },
            "role_hierarchy": {
                role.value: [r.value for r in children]
                for role, children in ROLE_HIERARCHY.items()
            },
            "module_permissions": {
                module: [r.value for r in roles]
                for module, roles in MODULE_PERMISSIONS.items()
            },
            "endpoints": endpoints,
            "endpoints_count": len(endpoints),
        },
        message="Системная информация",
    )


@router.get("/settings")
async def get_system_settings(
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SystemSettingsService(uow)
    settings = await service.get_or_create()
    return success_response(
        data=SystemSettingsOut.model_validate(settings).model_dump(),
        message="Настройки системы",
    )


@router.patch("/settings")
async def update_system_settings(
    data: SystemSettingsUpdate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SystemSettingsService(uow)
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return error_response("Нет данных для обновления", status_code=400)
    try:
        settings = await service.update(update_data)
        await uow.commit()
    except ValueError as exc:
        return error_response(str(exc), status_code=400)
    return success_response(
        data=SystemSettingsOut.model_validate(settings).model_dump(),
        message="Настройки системы обновлены",
    )
