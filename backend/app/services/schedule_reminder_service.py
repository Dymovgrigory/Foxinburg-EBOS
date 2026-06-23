import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy import select, and_, or_

from app.models.schedule import Schedule
from app.models.group import GroupMembership
from app.models.schedule_reminder_log import ScheduleReminderLog
from app.models.user import User
from app.services.schedule_service import ScheduleService
from app.services.notification_dispatcher import NotificationDispatcher
from app.services.unit_of_work import UnitOfWork
from app.utils import utc_now

logger = logging.getLogger(__name__)

# За сколько минут до занятия отправляем напоминания
REMINDER_LEADS = [
    ("24h", 24 * 60),
    ("1h", 60),
]

# Допуск ±5 минут, чтобы не пропустить вхождение между запусками шедулера
REMINDER_TOLERANCE_MINUTES = 5


class ScheduleReminderService:
    """Отправляет напоминания о предстоящих занятиях студентам и преподавателям."""

    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.schedule_service = ScheduleService(uow)
        self.dispatcher = NotificationDispatcher(uow)

    async def process_all_reminders(self) -> Dict[str, int]:
        """Обрабатывает все типы напоминаний. Возвращает счётчики по типам."""
        counters: Dict[str, int] = {}
        for reminder_type, lead_minutes in REMINDER_LEADS:
            counters[reminder_type] = await self.process_reminders(reminder_type, lead_minutes)
        return counters

    async def process_reminders(self, reminder_type: str, lead_minutes: int) -> int:
        """Находит вхождения в окне lead_minutes ± tolerance и отправляет напоминания."""
        now = utc_now()
        lower = now + timedelta(minutes=lead_minutes - REMINDER_TOLERANCE_MINUTES)
        upper = now + timedelta(minutes=lead_minutes + REMINDER_TOLERANCE_MINUTES)

        occurrences = await self._find_occurrences_in_window(lower, upper)
        sent_count = 0

        for occurrence in occurrences:
            schedule_id = occurrence["schedule_id"]
            occurrence_date = occurrence["occurrence_date"]
            start_time = occurrence["start_time"]
            recipients = await self._get_recipients(schedule_id)

            for user_id in recipients:
                if await self._already_sent(schedule_id, occurrence_date, user_id, reminder_type):
                    continue

                await self._send_reminder(
                    user_id=user_id,
                    occurrence=occurrence,
                    reminder_type=reminder_type,
                )
                sent_count += 1

        return sent_count

    async def _find_occurrences_in_window(
        self,
        lower: datetime,
        upper: datetime,
    ) -> List[Dict[str, Any]]:
        """Возвращает вхождения занятий, попадающие в заданный временной интервал."""
        result = await self.uow.session.execute(
            select(Schedule).where(
                Schedule.status != "cancelled",
                Schedule.start_time <= upper,
                or_(
                    Schedule.recurrence_end.is_(None),
                    Schedule.recurrence_end >= lower,
                ),
            )
        )
        schedules = result.scalars().all()

        occurrences: List[Dict[str, Any]] = []
        for schedule in schedules:
            schedule_occurrences = await self.schedule_service.generate_occurrences(
                schedule, lower, upper
            )
            for occ in schedule_occurrences:
                # Проверяем, что само начало вхождения попадает в окно
                if lower <= occ["start_time"] <= upper:
                    occurrences.append(occ)

        return occurrences

    async def _get_recipients(self, schedule_id: int) -> List[int]:
        """Собирает ID активных студентов группы и преподавателя занятия."""
        schedule = await self.schedule_service.get_by_id(schedule_id)
        if not schedule or not schedule.group_id:
            return []

        recipients: set = set()

        # Активные ученики группы
        result = await self.uow.session.execute(
            select(GroupMembership.student_id).where(
                GroupMembership.group_id == schedule.group_id,
                GroupMembership.status == "active",
            )
        )
        for row in result.all():
            recipients.add(row[0])

        # Преподаватель
        if schedule.teacher_id:
            recipients.add(schedule.teacher_id)

        return list(recipients)

    async def _already_sent(
        self,
        schedule_id: int,
        occurrence_date,
        user_id: int,
        reminder_type: str,
    ) -> bool:
        result = await self.uow.session.execute(
            select(ScheduleReminderLog.id).where(
                ScheduleReminderLog.schedule_id == schedule_id,
                ScheduleReminderLog.occurrence_date == occurrence_date,
                ScheduleReminderLog.user_id == user_id,
                ScheduleReminderLog.reminder_type == reminder_type,
            )
        )
        return result.scalar_one_or_none() is not None

    async def _send_reminder(
        self,
        user_id: int,
        occurrence: Dict[str, Any],
        reminder_type: str,
    ) -> None:
        schedule_id = occurrence["schedule_id"]
        occurrence_date = occurrence["occurrence_date"]
        start_time = occurrence["start_time"]
        title = occurrence["title"]
        room = occurrence.get("room") or "—"

        when_label = "завтра" if reminder_type == "24h" else "через час"
        time_label = start_time.strftime("%H:%M")
        date_label = start_time.strftime("%d.%m.%Y")

        message = (
            f"Напоминание: {when_label} у вас занятие «{title}» в {time_label} "
            f"({date_label}). Аудитория / ссылка: {room}."
        )

        await self.dispatcher.notify_user(
            user_id=user_id,
            title=f"Напоминание о занятии «{title}»",
            message=message,
            type_="schedule",
            entity_type="schedule",
            entity_id=schedule_id,
            link=f"/schedule?occurrence={occurrence['occurrence_id']}",
        )

        log = ScheduleReminderLog(
            schedule_id=schedule_id,
            occurrence_date=occurrence_date,
            user_id=user_id,
            reminder_type=reminder_type,
            channel="in_app",
            sent_at=utc_now(),
        )
        self.uow.session.add(log)
