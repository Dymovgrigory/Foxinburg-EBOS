from fastapi import APIRouter, Depends

from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = NotificationService(uow)
    notifications = await service.get_user_notifications(current_user.id)
    return success_response(
        data=[NotificationResponse.model_validate(n).model_dump() for n in notifications],
        message="Список уведомлений",
    )


@router.get("/unread-count")
async def unread_count(
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = NotificationService(uow)
    count = await service.get_unread_count(current_user.id)
    return success_response(data={"count": count}, message="Количество непрочитанных уведомлений")


@router.post("")
async def create_notification(
    data: NotificationCreate,
    current_user=Depends(require_permission(Permission.NOTIFICATION_SEND)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = NotificationService(uow)
    notifications = await service.create_bulk_notifications(
        user_ids=data.user_ids,
        title=data.title,
        message=data.message,
        type_=data.type or "system",
        link=data.link,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
    )
    await uow.commit()
    return success_response(
        data=[NotificationResponse.model_validate(n).model_dump() for n in notifications],
        message="Уведомления отправлены",
        status_code=201,
    )


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = NotificationService(uow)
    notification = await service.mark_read(notification_id, current_user.id)
    if not notification:
        return error_response("Уведомление не найдено", status_code=404)
    await uow.commit()
    return success_response(
        data=NotificationResponse.model_validate(notification).model_dump(),
        message="Уведомление отмечено прочитанным",
    )


@router.patch("/read-all")
async def mark_all_read(
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = NotificationService(uow)
    count = await service.mark_all_read(current_user.id)
    await uow.commit()
    return success_response(data={"marked": count}, message="Все уведомления прочитаны")


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = NotificationService(uow)
    notification = await service.soft_delete(notification_id, current_user.id)
    if not notification:
        return error_response("Уведомление не найдено", status_code=404)
    await uow.commit()
    return success_response(
        data=NotificationResponse.model_validate(notification).model_dump(),
        message="Уведомление удалено",
    )
