from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, func

from app.services.unit_of_work import UnitOfWork
from app.models.notification import Notification
from app.utils import utc_now


class NotificationService:
    """Сервис создания и управления уведомлениями пользователей."""

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_notification(
        self,
        *,
        user_id: int,
        title: str,
        message: str,
        type_: str = "info",
        link: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type_,
            link=link,
            entity_type=entity_type,
            entity_id=entity_id,
            is_read=False,
            is_deleted=False,
            created_at=utc_now(),
        )
        self.uow.session.add(notification)
        await self.uow.session.flush()
        await self.uow.session.refresh(notification)
        return notification

    async def create_bulk_notifications(
        self,
        *,
        user_ids: List[int],
        title: str,
        message: str,
        type_: str = "info",
        link: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
    ) -> List[Notification]:
        notifications = [
            Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=type_,
                link=link,
                entity_type=entity_type,
                entity_id=entity_id,
                is_read=False,
                is_deleted=False,
                created_at=utc_now(),
            )
            for user_id in set(user_ids)
        ]
        self.uow.session.add_all(notifications)
        await self.uow.session.flush()
        for n in notifications:
            await self.uow.session.refresh(n)
        return notifications

    async def get_user_notifications(self, user_id: int) -> List[Notification]:
        result = await self.uow.session.execute(
            select(Notification)
            .where(Notification.user_id == user_id, Notification.is_deleted == False)
            .order_by(Notification.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_unread_count(self, user_id: int) -> int:
        result = await self.uow.session.execute(
            select(func.count(Notification.id))
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
        )
        return result.scalar_one()

    async def mark_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        result = await self.uow.session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
                Notification.is_deleted == False,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            return None
        notification.is_read = True
        notification.read_at = utc_now()
        await self.uow.session.flush()
        await self.uow.session.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: int) -> int:
        result = await self.uow.session.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
        )
        notifications = result.scalars().all()
        now = utc_now()
        for n in notifications:
            n.is_read = True
            n.read_at = now
        await self.uow.session.flush()
        return len(notifications)

    async def soft_delete(self, notification_id: int, user_id: int) -> Optional[Notification]:
        result = await self.uow.session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
                Notification.is_deleted == False,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            return None
        notification.is_deleted = True
        await self.uow.session.flush()
        await self.uow.session.refresh(notification)
        return notification
