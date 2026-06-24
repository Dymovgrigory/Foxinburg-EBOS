import logging
from typing import Optional

from sqlalchemy import select

from app.models.user import User
from app.services.email_service import EmailService
from app.services.max_service import MaxService
from app.services.notification_service import NotificationService
from app.services.telegram_service import TelegramService
from app.services.unit_of_work import UnitOfWork

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.email_service = EmailService()
        self.telegram_service = TelegramService()
        self.max_service = MaxService()

    async def notify_user(
        self,
        user_id: int,
        title: str,
        message: str,
        type_: str = "info",
        link: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        send_external: bool = True,
    ) -> None:
        result = await self.uow.session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning("Пользователь %s не найден для уведомления", user_id)
            return

        notification_service = NotificationService(self.uow)
        await notification_service.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            type_=type_,
            link=link,
            entity_type=entity_type,
            entity_id=entity_id,
        )

        if not send_external:
            return

        if user.email:
            await self.email_service.send_email(
                to_email=user.email,
                subject=title,
                body=f"{message}\n\n{link or ''}",
            )

        if user.telegram_chat_id:
            await self.telegram_service.send_message(
                chat_id=user.telegram_chat_id,
                text=f"*{title}*\n{message}" + (f"\n{link}" if link else ""),
            )

        if user.max_user_id:
            await self.max_service.send_message(
                user_id=user.max_user_id,
                text=f"*{title}*\n{message}" + (f"\n{link}" if link else ""),
            )
