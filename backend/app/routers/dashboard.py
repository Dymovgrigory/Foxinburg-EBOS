from fastapi import APIRouter, Depends

from app.core.dependencies import require_active_user
from app.models.user import User
from app.core.responses import success_response
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Ролевая сводка для главного дашборда."""
    service = DashboardService(uow, current_user)
    data = await service.get_summary()
    return success_response(data=data, message="Сводка дашборда")
