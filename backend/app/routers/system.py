from fastapi import APIRouter, Depends, Request

from app.core.dependencies import require_permission
from app.core.permissions import Permission, ROLE_PERMISSIONS, ROLE_HIERARCHY, MODULE_PERMISSIONS
from app.core.responses import success_response

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
