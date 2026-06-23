from typing import List, Optional, Dict
from datetime import datetime, timedelta, date
from sqlalchemy import select, and_, or_
from dateutil.relativedelta import relativedelta

from app.models.schedule import Schedule, Attendance, ScheduleException
from app.models.group import Group, GroupMembership
from app.models.user import User
from app.models.organization import Branch
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.core.events import EventBus, SystemEventType
from app.utils import utc_now


class ScheduleService(BaseService[Schedule]):
    model = Schedule

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, schedule_id: int) -> Optional[Schedule]:
        result = await self.uow.session.execute(select(Schedule).where(Schedule.id == schedule_id))
        return result.scalar_one_or_none()

    async def list_schedules(
        self,
        *,
        group_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        room: Optional[str] = None,
        status: Optional[str] = None,
        start_from: Optional[datetime] = None,
        start_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Schedule]:
        query = select(Schedule)
        filters = []
        if group_id:
            filters.append(Schedule.group_id == group_id)
        if teacher_id:
            filters.append(Schedule.teacher_id == teacher_id)
        if branch_id:
            filters.append(Schedule.branch_id == branch_id)
        if room:
            filters.append(Schedule.room == room)
        if status:
            filters.append(Schedule.status == status)
        if start_from:
            filters.append(Schedule.start_time >= start_from)
        if start_to:
            filters.append(Schedule.start_time <= start_to)
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(Schedule.start_time).limit(limit).offset(offset)
        result = await self.uow.session.execute(query)
        return list(result.scalars().all())

    async def _exists(self, model, entity_id: Optional[int]) -> bool:
        if entity_id is None:
            return True
        result = await self.uow.session.execute(select(model.id).where(model.id == entity_id))
        return result.scalar_one_or_none() is not None

    async def validate_references(
        self,
        group_id: int,
        teacher_id: int,
        branch_id: Optional[int] = None,
        replacement_teacher_id: Optional[int] = None,
    ) -> None:
        if not await self._exists(Group, group_id):
            raise ValueError("Группа не найдена")
        if not await self._exists(User, teacher_id):
            raise ValueError("Преподаватель не найден")
        if branch_id is not None and not await self._exists(Branch, branch_id):
            raise ValueError("Филиал не найден")
        if replacement_teacher_id is not None and not await self._exists(User, replacement_teacher_id):
            raise ValueError("Заменяющий преподаватель не найден")

    async def validate_no_conflicts(
        self,
        *,
        schedule_id: Optional[int] = None,
        group_id: int,
        teacher_id: int,
        branch_id: Optional[int] = None,
        room: Optional[str] = None,
        start_time: datetime,
        end_time: datetime,
    ) -> None:
        """Проверяем пересечения: преподаватель, аудитория, группа."""
        overlap = and_(Schedule.start_time < end_time, Schedule.end_time > start_time)
        query = select(Schedule).where(overlap)
        if schedule_id is not None:
            query = query.where(Schedule.id != schedule_id)

        # Любое совпадение по преподавателю, группе или аудитории + филиалу
        conditions = [Schedule.group_id == group_id]
        if teacher_id:
            conditions.append(Schedule.teacher_id == teacher_id)
        if room and branch_id:
            conditions.append(and_(Schedule.room == room, Schedule.branch_id == branch_id))

        query = query.where(or_(*conditions))
        result = await self.uow.session.execute(query)
        conflicts = result.scalars().all()
        if conflicts:
            conflict = conflicts[0]
            raise ValueError(
                f"Конфликт расписания с занятием «{conflict.title}» ({conflict.start_time:%d.%m %H:%M})"
            )

    async def _load_exceptions_map(
        self,
        schedule_id: int,
        from_date: datetime,
        to_date: datetime,
    ) -> Dict[date, ScheduleException]:
        result = await self.uow.session.execute(
            select(ScheduleException)
            .where(
                ScheduleException.schedule_id == schedule_id,
                ScheduleException.exception_date >= from_date.date(),
                ScheduleException.exception_date <= to_date.date(),
            )
        )
        return {exc.exception_date: exc for exc in result.scalars().all()}

    def _occurrence_id(self, schedule_id: int, occurrence_date: date) -> str:
        return f"{schedule_id}_{occurrence_date.isoformat().replace('-', '')}"

    def _replace_date_time(self, base: datetime, occurrence_date: date) -> datetime:
        return base.replace(year=occurrence_date.year, month=occurrence_date.month, day=occurrence_date.day)

    def _build_occurrence(
        self,
        schedule: Schedule,
        occurrence_date: date,
        exception: Optional[ScheduleException],
    ) -> Optional[dict]:
        if exception and exception.is_cancelled:
            return None

        start = exception.start_time if exception and exception.start_time else self._replace_date_time(schedule.start_time, occurrence_date)
        end = exception.end_time if exception and exception.end_time else self._replace_date_time(schedule.end_time, occurrence_date)

        return {
            "occurrence_id": self._occurrence_id(schedule.id, occurrence_date),
            "occurrence_date": occurrence_date,
            "schedule_id": schedule.id,
            "title": schedule.title,
            "topic": schedule.topic,
            "description": schedule.description,
            "group_id": schedule.group_id,
            "teacher_id": exception.teacher_id if exception and exception.teacher_id is not None else schedule.teacher_id,
            "replacement_teacher_id": exception.replacement_teacher_id if exception and exception.replacement_teacher_id is not None else schedule.replacement_teacher_id,
            "branch_id": schedule.branch_id,
            "course_id": schedule.course_id,
            "lesson_id": schedule.lesson_id,
            "room": exception.room if exception and exception.room is not None else schedule.room,
            "start_time": start,
            "end_time": end,
            "status": schedule.status,
            "color": schedule.color,
            "is_online": schedule.is_online,
            "recurrence": schedule.recurrence,
            "is_exception": exception is not None,
            "is_cancelled": False,
        }

    async def generate_occurrences(
        self,
        schedule: Schedule,
        from_date: datetime,
        to_date: datetime,
    ) -> List[dict]:
        """Разворачиваем повторяющееся занятие в список вхождений."""
        exceptions_map = await self._load_exceptions_map(schedule.id, from_date, to_date)

        if schedule.recurrence == "none":
            occurrence_date = schedule.start_time.date()
            if from_date.date() <= occurrence_date <= to_date.date():
                occurrence = self._build_occurrence(schedule, occurrence_date, exceptions_map.get(occurrence_date))
                return [occurrence] if occurrence else []
            return []

        occurrences = []
        recurrence_end = schedule.recurrence_end
        effective_end = to_date
        if recurrence_end and recurrence_end < to_date:
            effective_end = recurrence_end

        delta_map = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": relativedelta(months=1),
        }
        delta = delta_map.get(schedule.recurrence, timedelta(days=1))

        current_date = schedule.start_time.date()
        # Ограничение на количество вхождений для защиты от бесконечных циклов
        max_occurrences = 366
        count = 0
        while current_date <= effective_end.date() and count < max_occurrences:
            if current_date >= from_date.date():
                occurrence = self._build_occurrence(schedule, current_date, exceptions_map.get(current_date))
                if occurrence:
                    occurrences.append(occurrence)
            current_date = (datetime.combine(current_date, schedule.start_time.time()) + delta).date()
            count += 1
        return occurrences

    async def create_schedule(
        self,
        *,
        title: str,
        group_id: int,
        teacher_id: int,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
        branch_id: Optional[int] = None,
        course_id: Optional[int] = None,
        lesson_id: Optional[int] = None,
        room: Optional[str] = None,
        recurrence: str = "none",
        recurrence_end: Optional[datetime] = None,
        status: str = "scheduled",
        color: Optional[str] = None,
        is_online: bool = False,
        topic: Optional[str] = None,
        replacement_teacher_id: Optional[int] = None,
    ) -> Schedule:
        await self.validate_references(group_id, teacher_id, branch_id, replacement_teacher_id)
        await self.validate_no_conflicts(
            group_id=group_id,
            teacher_id=teacher_id,
            branch_id=branch_id,
            room=room,
            start_time=start_time,
            end_time=end_time,
        )
        schedule = Schedule(
            title=title,
            group_id=group_id,
            teacher_id=teacher_id,
            start_time=start_time,
            end_time=end_time,
            description=description,
            branch_id=branch_id,
            course_id=course_id,
            lesson_id=lesson_id,
            room=room,
            recurrence=recurrence,
            recurrence_end=recurrence_end,
            status=status,
            color=color,
            is_online=is_online,
            topic=topic,
            replacement_teacher_id=replacement_teacher_id,
        )
        await self.add(schedule)
        await self.uow.session.flush()
        await self.uow.session.refresh(schedule)

        await EventBus.publish(
            self.uow,
            SystemEventType.SCHEDULE_CREATED,
            {
                "schedule_id": schedule.id,
                "group_id": schedule.group_id,
                "title": schedule.title,
            },
            user_id=teacher_id,
        )
        return schedule

    async def update_schedule(
        self,
        schedule_id: int,
        *,
        data: dict,
    ) -> Optional[Schedule]:
        schedule = await self.get_by_id(schedule_id)
        if not schedule:
            return None
        for field, value in data.items():
            setattr(schedule, field, value)
        await self.validate_references(
            schedule.group_id,
            schedule.teacher_id,
            schedule.branch_id,
            schedule.replacement_teacher_id,
        )
        await self.validate_no_conflicts(
            schedule_id=schedule_id,
            group_id=schedule.group_id,
            teacher_id=schedule.teacher_id,
            branch_id=schedule.branch_id,
            room=schedule.room,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
        )
        await self.uow.session.flush()
        await self.uow.session.refresh(schedule)

        await EventBus.publish(
            self.uow,
            SystemEventType.SCHEDULE_UPDATED,
            {
                "schedule_id": schedule.id,
                "group_id": schedule.group_id,
                "title": schedule.title,
            },
            user_id=schedule.teacher_id,
        )
        return schedule

    async def delete_schedule(self, schedule_id: int) -> Optional[Schedule]:
        schedule = await self.get_by_id(schedule_id)
        if not schedule:
            return None
        payload = {
            "schedule_id": schedule.id,
            "group_id": schedule.group_id,
            "title": schedule.title,
        }
        await self.uow.session.delete(schedule)
        await self.uow.session.flush()

        await EventBus.publish(
            self.uow,
            SystemEventType.SCHEDULE_CANCELLED,
            payload,
            user_id=schedule.teacher_id,
        )
        return schedule


    async def get_exception(
        self,
        schedule_id: int,
        exception_date: date,
    ) -> Optional[ScheduleException]:
        result = await self.uow.session.execute(
            select(ScheduleException).where(
                ScheduleException.schedule_id == schedule_id,
                ScheduleException.exception_date == exception_date,
            )
        )
        return result.scalar_one_or_none()

    async def list_exceptions(self, schedule_id: int) -> List[ScheduleException]:
        result = await self.uow.session.execute(
            select(ScheduleException)
            .where(ScheduleException.schedule_id == schedule_id)
            .order_by(ScheduleException.exception_date)
        )
        return list(result.scalars().all())

    async def create_or_update_exception(
        self,
        schedule_id: int,
        exception_date: date,
        data: dict,
    ) -> ScheduleException:
        exception = await self.get_exception(schedule_id, exception_date)
        if exception:
            for field, value in data.items():
                if value is not None:
                    setattr(exception, field, value)
        else:
            exception = ScheduleException(schedule_id=schedule_id, exception_date=exception_date, **data)
            self.uow.session.add(exception)
        await self.uow.session.flush()
        await self.uow.session.refresh(exception)
        return exception

    async def delete_exception(self, schedule_id: int, exception_date: date) -> bool:
        exception = await self.get_exception(schedule_id, exception_date)
        if not exception:
            return False
        await self.uow.session.delete(exception)
        await self.uow.session.flush()
        return True


class AttendanceService(BaseService[Attendance]):
    model = Attendance

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, attendance_id: int) -> Optional[Attendance]:
        result = await self.uow.session.execute(select(Attendance).where(Attendance.id == attendance_id))
        return result.scalar_one_or_none()

    async def list_by_schedule(
        self,
        schedule_id: int,
        occurrence_date: Optional[date] = None,
    ) -> List[Attendance]:
        query = select(Attendance).where(Attendance.schedule_id == schedule_id)
        if occurrence_date:
            query = query.where(Attendance.occurrence_date == occurrence_date)
        result = await self.uow.session.execute(query)
        return list(result.scalars().all())

    async def list_by_student(self, student_id: int, limit: int = 100, offset: int = 0) -> List[Attendance]:
        result = await self.uow.session.execute(
            select(Attendance)
            .where(Attendance.student_id == student_id)
            .order_by(Attendance.occurrence_date.desc(), Attendance.marked_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def _validate_student_in_group(self, schedule_id: int, student_id: int) -> None:
        schedule_result = await self.uow.session.execute(
            select(Schedule.group_id).where(Schedule.id == schedule_id)
        )
        group_id = schedule_result.scalar_one_or_none()
        if group_id is None:
            raise ValueError("Занятие не найдено")

        membership_result = await self.uow.session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group_id,
                GroupMembership.student_id == student_id,
                GroupMembership.status == "active",
            )
        )
        if membership_result.scalar_one_or_none() is None:
            raise ValueError("Ученик не состоит в группе занятия")

    async def mark_attendance(
        self,
        *,
        schedule_id: int,
        student_id: int,
        occurrence_date: date,
        status: str,
        marked_by_id: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> Attendance:
        await self._validate_student_in_group(schedule_id, student_id)

        result = await self.uow.session.execute(
            select(Attendance).where(
                Attendance.schedule_id == schedule_id,
                Attendance.occurrence_date == occurrence_date,
                Attendance.student_id == student_id,
            )
        )
        attendance = result.scalar_one_or_none()
        if attendance:
            attendance.status = status
            attendance.notes = notes
            attendance.marked_by_id = marked_by_id
            attendance.marked_at = utc_now()
        else:
            attendance = Attendance(
                schedule_id=schedule_id,
                student_id=student_id,
                occurrence_date=occurrence_date,
                status=status,
                marked_by_id=marked_by_id,
                notes=notes,
            )
            self.uow.session.add(attendance)
        await self.uow.commit()
        await self.uow.session.refresh(attendance)
        return attendance
