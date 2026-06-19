import json
import logging
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List

from app.services.unit_of_work import UnitOfWork

logger = logging.getLogger(__name__)


class SystemEventType(str, Enum):
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_LOGGED_IN = "user.logged_in"
    USER_ROLE_CHANGED = "user.role_changed"

    COURSE_CREATED = "course.created"
    COURSE_UPDATED = "course.updated"
    COURSE_ENROLLED = "course.enrolled"

    MODULE_COMPLETED = "module.completed"
    LESSON_COMPLETED = "lesson.completed"
    LESSON_AVAILABLE = "lesson.available"
    TEST_PASSED = "test.passed"
    TEST_FAILED = "test.failed"

    HOMEWORK_SUBMITTED = "homework.submitted"
    HOMEWORK_REVIEWED = "homework.reviewed"

    LEAD_CREATED = "lead.created"
    LEAD_CONVERTED = "lead.converted"

    PAYMENT_RECEIVED = "payment.received"
    BALANCE_CHANGED = "balance.changed"

    NOTIFICATION_SENT = "notification.sent"
    ACHIEVEMENT_EARNED = "achievement.earned"


EventHandler = Callable[[SystemEventType, dict, int], Any]


class EventBus:
    _handlers: Dict[SystemEventType, List[EventHandler]] = {}

    @classmethod
    def subscribe(cls, event_type: SystemEventType, handler: EventHandler) -> None:
        if event_type not in cls._handlers:
            cls._handlers[event_type] = []
        cls._handlers[event_type].append(handler)

    @classmethod
    def unsubscribe(cls, event_type: SystemEventType, handler: EventHandler) -> None:
        cls._handlers.get(event_type, []).remove(handler)

    @classmethod
    async def publish(
        cls,
        uow: UnitOfWork,
        event_type: SystemEventType,
        payload: dict,
        user_id: int = None,
    ) -> None:
        """Публикует событие внутри текущего UnitOfWork.

        Событие сохраняется в system_events и будет закоммичено вместе с UoW.
        Обработчики вызываются после успешного commit через post-commit hooks.
        """
        from app.models.event import SystemEvent

        event_value = event_type.value if isinstance(event_type, Enum) else event_type
        payload_str = json.dumps(payload, ensure_ascii=False) if isinstance(payload, dict) else payload

        event = SystemEvent(
            type=event_value,
            payload=payload_str,
            user_id=user_id,
            is_processed=False,
            created_at=datetime.utcnow(),
        )
        uow.session.add(event)

        # Планируем обработчиков после коммита
        async def _dispatch_hook():
            await cls._dispatch(event_type, payload, user_id)

        uow.add_post_commit_hook(_dispatch_hook)

    @classmethod
    async def _dispatch(cls, event_type: SystemEventType, payload: dict, user_id: int) -> None:
        handlers = cls._handlers.get(event_type, [])
        for handler in handlers:
            try:
                await handler(event_type, payload, user_id)
            except Exception:
                logger.exception("Event handler failed for %s", event_type)


# --- Подписчики по умолчанию ---

async def log_event_handler(event_type: SystemEventType, payload: dict, user_id: int) -> None:
    print(f"[EVENT] {event_type.value} | user={user_id} | payload={payload}")


async def notify_on_login(event_type: SystemEventType, payload: dict, user_id: int) -> None:
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_service import NotificationService

    async with UnitOfWork() as uow:
        await NotificationService.create_notification(
            uow,
            user_id=user_id,
            title="Вы вошли в систему",
            message=f"Добро пожаловать, {payload.get('email', '')}",
            type_="system",
        )
        await uow.commit()


for event_type in SystemEventType:
    EventBus.subscribe(event_type, log_event_handler)

EventBus.subscribe(SystemEventType.USER_LOGGED_IN, notify_on_login)
