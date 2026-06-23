from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ScheduleBase(BaseModel):
    title: str
    description: Optional[str] = None
    group_id: int
    teacher_id: int
    branch_id: Optional[int] = None
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    room: Optional[str] = None
    start_time: datetime
    end_time: datetime
    recurrence: Optional[str] = "none"
    recurrence_end: Optional[datetime] = None
    status: Optional[str] = "scheduled"
    color: Optional[str] = None
    is_online: Optional[bool] = False
    topic: Optional[str] = None
    replacement_teacher_id: Optional[int] = None


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    group_id: Optional[int] = None
    teacher_id: Optional[int] = None
    branch_id: Optional[int] = None
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    room: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    recurrence: Optional[str] = None
    recurrence_end: Optional[datetime] = None
    status: Optional[str] = None
    color: Optional[str] = None
    is_online: Optional[bool] = None
    topic: Optional[str] = None
    replacement_teacher_id: Optional[int] = None


class ScheduleResponse(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AttendanceBase(BaseModel):
    schedule_id: int
    student_id: int
    status: str
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    marked_by_id: Optional[int] = None
    marked_at: datetime
