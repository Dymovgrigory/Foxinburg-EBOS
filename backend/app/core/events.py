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

    SCHEDULE_CREATED = "schedule.created"
    SCHEDULE_UPDATED = "schedule.updated"
    SCHEDULE_CANCELLED = "schedule.cancelled"

    CHAT_MESSAGE_SENT = "chat.message.sent"


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


async def notify_on_schedule_change(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_service import NotificationService
    from app.models.user import User
    from app.models.group import Group

    schedule_id = payload.get("schedule_id")
    group_id = payload.get("group_id")
    title = payload.get("title", "Занятие")
    if not group_id:
        return

    async with UnitOfWork() as uow:
        group_result = await uow.session.execute(select(Group).where(Group.id == group_id))
        group = group_result.scalar_one_or_none()
        if not group:
            return

        user_ids = []
        if group.teacher_id:
            user_ids.append(group.teacher_id)
        student_result = await uow.session.execute(
            select(User.id).where(User.group_id == group_id)
        )
        user_ids.extend([r[0] for r in student_result.all()])
        user_ids = list(set(user_ids))
        if not user_ids:
            return

        if event_type == SystemEventType.SCHEDULE_CREATED:
            msg_title = "Новое занятие"
            msg_body = f"Добавлено занятие \"{title}\""
        elif event_type == SystemEventType.SCHEDULE_CANCELLED:
            msg_title = "Занятие отменено"
            msg_body = f"Занятие \"{title}\" отменено"
        else:
            msg_title = "Изменение занятия"
            msg_body = f"Обновлено занятие \"{title}\""

        await NotificationService(uow).create_bulk_notifications(
            user_ids=user_ids,
            title=msg_title,
            message=msg_body,
            type_="schedule",
            entity_type="schedule",
            entity_id=schedule_id,
            link="/calendar",
        )
        await uow.commit()


for event_type in SystemEventType:
    EventBus.subscribe(event_type, log_event_handler)

EventBus.subscribe(SystemEventType.USER_LOGGED_IN, notify_on_login)
EventBus.subscribe(SystemEventType.SCHEDULE_CREATED, notify_on_schedule_change)
EventBus.subscribe(SystemEventType.SCHEDULE_UPDATED, notify_on_schedule_change)
EventBus.subscribe(SystemEventType.SCHEDULE_CANCELLED, notify_on_schedule_change)
