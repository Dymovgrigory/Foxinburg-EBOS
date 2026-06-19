import json
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession


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


class EventBus:
    _handlers: Dict[SystemEventType, List[Callable]] = {}

    @classmethod
    def subscribe(cls, event_type: SystemEventType, handler: Callable):
        if event_type not in cls._handlers:
            cls._handlers[event_type] = []
        cls._handlers[event_type].append(handler)

    @classmethod
    async def publish(
        cls,
        db: AsyncSession,
        event_type: SystemEventType,
        payload: dict,
        user_id: int = None,
    ):
        from app.models.event import SystemEvent

        event = SystemEvent(
            type=event_type.value if isinstance(event_type, Enum) else event_type,
            payload=json.dumps(payload, ensure_ascii=False) if isinstance(payload, dict) else payload,
            user_id=user_id,
            created_at=datetime.utcnow(),
        )
        db.add(event)
        await db.commit()

        handlers = cls._handlers.get(event_type, [])
        for handler in handlers:
            await handler(db, event_type, payload, user_id)


# Подписчики по умолчанию
async def log_event(db: AsyncSession, event_type: SystemEventType, payload: dict, user_id: int):
    print(f"[EVENT] {event_type} | user={user_id} | payload={payload}")


for event_type in SystemEventType:
    EventBus.subscribe(event_type, log_event)
