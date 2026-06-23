import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Date, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)

    room = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    # none, daily, weekly, monthly
    recurrence = Column(String, default="none", nullable=False)
    recurrence_end = Column(DateTime, nullable=True)

    # scheduled, cancelled, completed
    status = Column(String, default="scheduled", nullable=False)

    # UI / BigBen-style extras
    color = Column(String, nullable=True)
    is_online = Column(Boolean, default=False, nullable=False)
    topic = Column(String, nullable=True)
    replacement_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    group = relationship("Group", back_populates="schedules")
    teacher = relationship("User", foreign_keys=[teacher_id])
    replacement_teacher = relationship("User", foreign_keys=[replacement_teacher_id])
    branch = relationship("Branch")
    course = relationship("Course", back_populates="schedules")
    lesson = relationship("Lesson", foreign_keys=[lesson_id], back_populates="schedules")
    attendances = relationship("Attendance", back_populates="schedule", cascade="all, delete-orphan")
    exceptions = relationship("ScheduleException", back_populates="schedule", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Schedule {self.title} {self.start_time}>"


class ScheduleException(Base):
    __tablename__ = "schedule_exceptions"
    __table_args__ = (UniqueConstraint("schedule_id", "exception_date", name="uq_schedule_exception_date"),)

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    exception_date = Column(Date, nullable=False)

    is_cancelled = Column(Boolean, default=False, nullable=False)

    # Переопределения для этого вхождения
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    room = Column(String, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    replacement_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    schedule = relationship("Schedule", back_populates="exceptions")
    teacher = relationship("User", foreign_keys=[teacher_id])
    replacement_teacher = relationship("User", foreign_keys=[replacement_teacher_id])

    def __repr__(self):
        return f"<ScheduleException {self.schedule_id} {self.exception_date}>"


class Attendance(Base):
    __tablename__ = "attendances"
    __table_args__ = (UniqueConstraint("schedule_id", "occurrence_date", "student_id", name="uq_attendance_occurrence"),)

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # present, absent, late, excused
    status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    marked_at = Column(DateTime, default=utc_now)

    # Конкретное вхождение повторяющегося занятия
    occurrence_date = Column(Date, nullable=False)

    schedule = relationship("Schedule", back_populates="attendances")
    student = relationship("User", foreign_keys=[student_id])
    marked_by = relationship("User", foreign_keys=[marked_by_id])

    def __repr__(self):
        return f"<Attendance schedule={self.schedule_id} date={self.occurrence_date} student={self.student_id} status={self.status}>"
