"""Тесты напоминаний о предстоящих занятиях."""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.core.permissions import Role
from app.models.schedule import Schedule, ScheduleException
from app.models.group import Group, GroupMembership
from app.models.notification import Notification
from app.models.schedule_reminder_log import ScheduleReminderLog
from app.services.schedule_reminder_service import ScheduleReminderService
from app.services.unit_of_work import UnitOfWork
from app.utils import utc_now


@pytest.fixture
async def reminder_setup(db_session, user_factory):
    """Группа, преподаватель, ученик и занятие через час для тестов напоминаний."""
    from app.models.organization import Organization, Branch

    unique = uuid.uuid4().hex[:8]
    org = Organization(name=f"Rem Org {unique}")
    db_session.add(org)
    await db_session.flush()

    branch = Branch(name=f"Rem Branch {unique}", organization_id=org.id)
    db_session.add(branch)
    await db_session.flush()

    teacher = await user_factory(Role.TEACHER, f"rem_teacher_{unique}@test.local")
    student = await user_factory(Role.STUDENT, f"rem_student_{unique}@test.local")

    group = Group(
        name=f"Rem Group {unique}",
        branch_id=branch.id,
        teacher_id=teacher.id,
        max_students=12,
        study_type="mini_group",
        academic_hour_minutes=45,
        balance_type="lessons",
        hourly_rate=0,
    )
    db_session.add(group)
    await db_session.flush()

    membership = GroupMembership(
        group_id=group.id,
        student_id=student.id,
        status="active",
        joined_at=utc_now().date(),
    )
    db_session.add(membership)
    await db_session.flush()

    start = utc_now() + timedelta(hours=1)
    schedule = Schedule(
        title=f"Rem Lesson {unique}",
        group_id=group.id,
        teacher_id=teacher.id,
        start_time=start,
        end_time=start + timedelta(hours=1),
    )
    db_session.add(schedule)
    await db_session.commit()

    yield {
        "teacher": teacher,
        "student": student,
        "group": group,
        "schedule": schedule,
        "org": org,
        "branch": branch,
    }

    # cleanup
    await db_session.execute(
        select(ScheduleReminderLog).where(ScheduleReminderLog.schedule_id == schedule.id)
    )
    result = await db_session.execute(
        select(ScheduleReminderLog).where(ScheduleReminderLog.schedule_id == schedule.id)
    )
    for log in result.scalars().all():
        await db_session.delete(log)

    result = await db_session.execute(
        select(Notification).where(Notification.entity_id == schedule.id, Notification.entity_type == "schedule")
    )
    for n in result.scalars().all():
        await db_session.delete(n)

    await db_session.delete(schedule)
    await db_session.delete(membership)
    await db_session.delete(group)
    await db_session.delete(branch)
    await db_session.delete(org)
    await db_session.commit()


class TestScheduleReminders:
    async def test_reminder_sent_to_student_and_teacher(self, reminder_setup):
        async with UnitOfWork() as uow:
            service = ScheduleReminderService(uow)
            counters = await service.process_reminders("1h", 60)
            await uow.commit()

        schedule = reminder_setup["schedule"]
        student_id = reminder_setup["student"].id
        teacher_id = reminder_setup["teacher"].id

        assert counters == 2

        async with UnitOfWork() as uow:
            result = await uow.session.execute(
                select(Notification).where(
                    Notification.entity_id == schedule.id,
                    Notification.entity_type == "schedule",
                )
            )
            notifications = result.scalars().all()
            notified_user_ids = {n.user_id for n in notifications}

        assert student_id in notified_user_ids
        assert teacher_id in notified_user_ids

    async def test_duplicate_reminder_not_sent(self, reminder_setup):
        async with UnitOfWork() as uow:
            service = ScheduleReminderService(uow)
            first = await service.process_reminders("1h", 60)
            await uow.commit()

        assert first == 2

        async with UnitOfWork() as uow:
            service = ScheduleReminderService(uow)
            second = await service.process_reminders("1h", 60)
            await uow.commit()

        assert second == 0

    async def test_cancelled_occurrence_does_not_trigger_reminder(self, reminder_setup):
        schedule = reminder_setup["schedule"]
        async with UnitOfWork() as uow:
            exception = ScheduleException(
                schedule_id=schedule.id,
                exception_date=schedule.start_time.date(),
                is_cancelled=True,
            )
            uow.session.add(exception)
            await uow.commit()

        async with UnitOfWork() as uow:
            service = ScheduleReminderService(uow)
            counters = await service.process_reminders("1h", 60)
            await uow.commit()

        assert counters == 0

        async with UnitOfWork() as uow:
            result = await uow.session.execute(
                select(Notification).where(
                    Notification.entity_id == schedule.id,
                    Notification.entity_type == "schedule",
                )
            )
            assert result.scalar_one_or_none() is None

    async def test_occurrence_outside_window_does_not_trigger_reminder(self, reminder_setup, db_session):
        schedule = reminder_setup["schedule"]
        # Переносим занятие на послезавтра
        schedule.start_time = utc_now() + timedelta(days=2)
        schedule.end_time = schedule.start_time + timedelta(hours=1)
        await db_session.commit()

        async with UnitOfWork() as uow:
            service = ScheduleReminderService(uow)
            counters = await service.process_reminders("1h", 60)
            await uow.commit()

        assert counters == 0
