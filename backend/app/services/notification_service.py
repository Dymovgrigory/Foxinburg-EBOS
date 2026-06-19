from datetime import datetime
from app.services.unit_of_work import UnitOfWork


class NotificationService:
    """Сервис создания уведомлений пользователям."""

    @classmethod
    async def create_notification(
        cls,
        uow: UnitOfWork,
        *,
        user_id: int,
        title: str,
        message: str,
        type_: str = "info",
    ):
        from app.models.notification import Notification

        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type_,
            is_read=False,
            created_at=datetime.utcnow(),
        )
        uow.session.add(notification)
        await uow.session.flush()
        await uow.session.refresh(notification)
        return notification
