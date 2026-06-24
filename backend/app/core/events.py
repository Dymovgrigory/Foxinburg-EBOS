import json
import logging
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List

from app.services.unit_of_work import UnitOfWork
from app.utils import utc_now

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
    HOMEWORK_ASSIGNED = "homework.assigned"

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
            created_at=utc_now(),
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
        service = NotificationService(uow)
        await service.create_notification(
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


async def notify_academy_enrolled(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.course import Course
    from app.models.user import User

    enrollment_id = payload.get("enrollment_id")
    student_id = payload.get("student_id")
    course_id = payload.get("course_id")
    if not student_id or not course_id:
        return

    async with UnitOfWork() as uow:
        course_result = await uow.session.execute(select(Course).where(Course.id == course_id))
        course = course_result.scalar_one_or_none()
        if not course or course.type != "teacher_academy":
            return

        dispatcher = NotificationDispatcher(uow)
        await dispatcher.notify_user(
            user_id=student_id,
            title="Вас зачислили в Академию педагогов",
            message="Начните обучение в личном кабинете. Первый модуль уже доступен.",
            type_="academy",
            link="/academy",
            entity_type="enrollment",
            entity_id=enrollment_id,
        )
        await uow.commit()


async def notify_lesson_available(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.course import Lesson, Module

    student_id = payload.get("student_id")
    lesson_id = payload.get("lesson_id")
    if not student_id or not lesson_id:
        return

    async with UnitOfWork() as uow:
        lesson_result = await uow.session.execute(
            select(Lesson)
            .where(Lesson.id == lesson_id)
            .options(selectinload(Lesson.module).selectinload(Module.course))
        )
        lesson = lesson_result.scalar_one_or_none()
        if not lesson:
            return

        dispatcher = NotificationDispatcher(uow)
        course = lesson.module.course
        if course.type == "teacher_academy":
            await dispatcher.notify_user(
                user_id=student_id,
                title="Доступен новый модуль Академии",
                message=f"Модуль «{lesson.module.title}» открыт для прохождения.",
                type_="academy",
                link="/academy",
                entity_type="lesson",
                entity_id=lesson_id,
            )
        else:
            await dispatcher.notify_user(
                user_id=student_id,
                title="Доступен новый урок",
                message=f"Урок «{lesson.title}» курса «{course.title}» открыт для прохождения.",
                type_="course",
                link=f"/courses/{course.id}/learn",
                entity_type="lesson",
                entity_id=lesson_id,
            )
        await uow.commit()


async def notify_lesson_completed(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.course import Lesson, Module

    student_id = payload.get("student_id")
    lesson_id = payload.get("lesson_id")
    if not student_id or not lesson_id:
        return

    async with UnitOfWork() as uow:
        lesson_result = await uow.session.execute(
            select(Lesson)
            .where(Lesson.id == lesson_id)
            .options(selectinload(Lesson.module).selectinload(Module.course))
        )
        lesson = lesson_result.scalar_one_or_none()
        if not lesson:
            return

        dispatcher = NotificationDispatcher(uow)
        course = lesson.module.course
        if course.type == "teacher_academy":
            await dispatcher.notify_user(
                user_id=student_id,
                title="Модуль Академии завершён",
                message=f"Вы завершили модуль «{lesson.module.title}».",
                type_="academy",
                link="/academy",
                entity_type="lesson",
                entity_id=lesson_id,
            )
        else:
            await dispatcher.notify_user(
                user_id=student_id,
                title="Урок завершён",
                message=f"Вы завершили урок «{lesson.title}» курса «{course.title}».",
                type_="course",
                link=f"/courses/{course.id}/learn",
                entity_type="lesson",
                entity_id=lesson_id,
            )
        await uow.commit()


async def notify_homework_reviewed(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.homework import Homework, HomeworkReview
    from app.models.course import Lesson, Module

    homework_id = payload.get("homework_id")
    if not homework_id:
        return

    async with UnitOfWork() as uow:
        hw_result = await uow.session.execute(
            select(Homework)
            .where(Homework.id == homework_id)
            .options(selectinload(Homework.lesson).selectinload(Lesson.module).selectinload(Module.course))
        )
        homework = hw_result.scalar_one_or_none()
        if not homework:
            return

        dispatcher = NotificationDispatcher(uow)
        status_text = "принято" if homework.status == "reviewed" else "требует доработки"
        course = homework.lesson.module.course
        link = "/academy" if course.type == "teacher_academy" else f"/courses/{course.id}/learn"
        await dispatcher.notify_user(
            user_id=homework.student_id,
            title="Домашнее задание проверено",
            message=f"Задание по модулю «{homework.lesson.module.title}» {status_text}.",
            type_="academy" if homework.lesson.module.course.type == "teacher_academy" else "homework",
            link=link,
            entity_type="homework",
            entity_id=homework_id,
        )
        await uow.commit()


async def notify_homework_submitted(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    """Уведомляет преподавателя/методиста о сданном домашнем задании."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.homework import Homework
    from app.models.course import Lesson
    from app.models.user import User
    from app.models.group import Group

    homework_id = payload.get("homework_id")
    student_id = payload.get("student_id")
    if not homework_id or not student_id:
        return

    async with UnitOfWork() as uow:
        hw_result = await uow.session.execute(
            select(Homework)
            .where(Homework.id == homework_id)
            .options(selectinload(Homework.lesson).selectinload(Lesson.module))
        )
        homework = hw_result.scalar_one_or_none()
        if not homework:
            return

        student_result = await uow.session.execute(
            select(User).where(User.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student or not student.group_id:
            return

        group_result = await uow.session.execute(
            select(Group).where(Group.id == student.group_id)
        )
        group = group_result.scalar_one_or_none()

        dispatcher = NotificationDispatcher(uow)
        recipient_ids = set()
        if group and group.teacher_id:
            recipient_ids.add(group.teacher_id)

        # Добавляем методистов и администраторов филиала студента
        staff_result = await uow.session.execute(
            select(User.id).where(
                User.branch_id == student.branch_id,
                User.role.in_(["methodist", "admin", "owner", "super_admin"]),
            )
        )
        recipient_ids.update([r[0] for r in staff_result.all()])

        for recipient_id in recipient_ids:
            await dispatcher.notify_user(
                user_id=recipient_id,
                title="Новое домашнее задание на проверку",
                message=f"Ученик {student.name or student.email} сдал задание по уроку «{homework.lesson.title}».",
                type_="homework",
                link="/homeworks",
                entity_type="homework",
                entity_id=homework_id,
            )
        await uow.commit()


async def notify_homework_assigned(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.homework import Homework
    from app.models.course import Lesson, Module

    homework_id = payload.get("homework_id")
    if not homework_id:
        return

    async with UnitOfWork() as uow:
        hw_result = await uow.session.execute(
            select(Homework)
            .where(Homework.id == homework_id)
            .options(selectinload(Homework.lesson).selectinload(Lesson.module).selectinload(Module.course))
        )
        homework = hw_result.scalar_one_or_none()
        if not homework:
            return

        dispatcher = NotificationDispatcher(uow)
        course = homework.lesson.module.course
        await dispatcher.notify_user(
            user_id=homework.student_id,
            title="Новое домашнее задание",
            message=f"Вам назначено задание по уроку «{homework.lesson.title}».",
            type_="homework",
            link=f"/courses/{course.id}/learn",
            entity_type="homework",
            entity_id=homework_id,
        )
        await uow.commit()


async def notify_test_result(
    event_type: SystemEventType, payload: dict, user_id: int
) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.services.unit_of_work import UnitOfWork
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.models.test import Test, TestAttempt
    from app.models.course import Lesson, Module

    attempt_id = payload.get("attempt_id")
    if not attempt_id:
        return

    async with UnitOfWork() as uow:
        attempt_result = await uow.session.execute(
            select(TestAttempt)
            .where(TestAttempt.id == attempt_id)
            .options(selectinload(TestAttempt.test).selectinload(Test.lesson).selectinload(Lesson.module).selectinload(Module.course))
        )
        attempt = attempt_result.scalar_one_or_none()
        if not attempt:
            return

        test = attempt.test
        lesson = test.lesson
        course = lesson.module.course
        passed = event_type == SystemEventType.TEST_PASSED

        dispatcher = NotificationDispatcher(uow)
        await dispatcher.notify_user(
            user_id=attempt.student_id,
            title="Тест пройден" if passed else "Тест не пройден",
            message=(
                f"Вы {'успешно прошли' if passed else 'не прошли'} тест «{test.title}» по уроку «{lesson.title}». "
                f"Баллы: {attempt.score}/{attempt.max_score}."
            ),
            type_="course" if passed else "event",
            link=f"/courses/{course.id}/learn",
            entity_type="lesson",
            entity_id=lesson.id,
        )
        await uow.commit()


EventBus.subscribe(SystemEventType.COURSE_ENROLLED, notify_academy_enrolled)
EventBus.subscribe(SystemEventType.LESSON_AVAILABLE, notify_lesson_available)
EventBus.subscribe(SystemEventType.LESSON_COMPLETED, notify_lesson_completed)
EventBus.subscribe(SystemEventType.HOMEWORK_REVIEWED, notify_homework_reviewed)
EventBus.subscribe(SystemEventType.HOMEWORK_SUBMITTED, notify_homework_submitted)
EventBus.subscribe(SystemEventType.HOMEWORK_ASSIGNED, notify_homework_assigned)
EventBus.subscribe(SystemEventType.TEST_PASSED, notify_test_result)
EventBus.subscribe(SystemEventType.TEST_FAILED, notify_test_result)
