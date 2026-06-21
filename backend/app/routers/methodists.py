from fastapi import APIRouter, Depends

from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.core.responses import success_response
from app.models.user import User
from app.services.methodist_analytics_service import MethodistAnalyticsService
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/methodists", tags=["methodists"])


@router.get("/dashboard")
async def methodist_dashboard(
    current_user: User = Depends(require_permission(Permission.COURSE_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    """Сводка для личного кабинета методиста."""
    service = MethodistAnalyticsService(uow)
    analytics = await service.get_analytics(branch_id=current_user.branch_id)
    overview = analytics["overview"]

    return success_response(
        data={
            "courses_count": overview["courses_count"],
            "groups_count": overview["groups_count"],
            "students_count": overview["students_count"],
            "pending_homeworks_count": overview["pending_homeworks_count"],
        },
        message="Сводка методиста",
    )


@router.get("/analytics")
async def methodist_analytics(
    current_user: User = Depends(require_permission(Permission.COURSE_UPDATE)),
    uow: UnitOfWork = Depends(get_uow),
):
    """Полная аналитика для дашборда методиста."""
    service = MethodistAnalyticsService(uow)
    data = await service.get_analytics(branch_id=current_user.branch_id)
    return success_response(data=data, message="Аналитика методиста")
