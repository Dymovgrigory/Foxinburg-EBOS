from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, and_

from app.models.schedule import Schedule, Attendance
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.core.events import EventBus, SystemEventType


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
        if start_from:
            filters.append(Schedule.start_time >= start_from)
        if start_to:
            filters.append(Schedule.start_time <= start_to)
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(Schedule.start_time).limit(limit).offset(offset)
        result = await self.uow.session.execute(query)
        return list(result.scalars().all())

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
    ) -> Schedule:
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


class AttendanceService(BaseService[Attendance]):
    model = Attendance

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, attendance_id: int) -> Optional[Attendance]:
        result = await self.uow.session.execute(select(Attendance).where(Attendance.id == attendance_id))
        return result.scalar_one_or_none()

    async def list_by_schedule(self, schedule_id: int) -> List[Attendance]:
        result = await self.uow.session.execute(
            select(Attendance).where(Attendance.schedule_id == schedule_id)
        )
        return list(result.scalars().all())

    async def list_by_student(self, student_id: int, limit: int = 100, offset: int = 0) -> List[Attendance]:
        result = await self.uow.session.execute(
            select(Attendance)
            .where(Attendance.student_id == student_id)
            .order_by(Attendance.marked_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def mark_attendance(
        self,
        *,
        schedule_id: int,
        student_id: int,
        status: str,
        marked_by_id: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> Attendance:
        # Если запись уже есть — обновляем
        result = await self.uow.session.execute(
            select(Attendance).where(
                Attendance.schedule_id == schedule_id,
                Attendance.student_id == student_id,
            )
        )
        attendance = result.scalar_one_or_none()
        if attendance:
            attendance.status = status
            attendance.notes = notes
            attendance.marked_by_id = marked_by_id
        else:
            attendance = Attendance(
                schedule_id=schedule_id,
                student_id=student_id,
                status=status,
                marked_by_id=marked_by_id,
                notes=notes,
            )
            self.uow.session.add(attendance)
        await self.uow.commit()
        await self.uow.session.refresh(attendance)
        return attendance
