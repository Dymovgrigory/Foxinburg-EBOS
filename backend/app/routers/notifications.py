from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate, NotificationResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    notifications = result.scalars().all()
    return success_response(
        data=[NotificationResponse.model_validate(n).model_dump() for n in notifications],
        message="Список уведомлений",
    )


@router.post("")
async def create_notification(
    data: NotificationCreate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    notification = Notification(**data.model_dump())
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return success_response(
        data=NotificationResponse.model_validate(notification).model_dump(),
        message="Уведомление создано",
        status_code=201,
    )


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        return error_response("Уведомление не найдено", status_code=404)
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await db.commit()
    await db.refresh(notification)
    return success_response(data=NotificationResponse.model_validate(notification).model_dump(), message="Прочитано")
