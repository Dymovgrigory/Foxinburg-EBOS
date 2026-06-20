import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


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

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    group = relationship("Group", back_populates="schedules")
    teacher = relationship("User", foreign_keys=[teacher_id])
    branch = relationship("Branch")
    course = relationship("Course")
    lesson = relationship("Lesson")
    attendances = relationship("Attendance", back_populates="schedule", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Schedule {self.title} {self.start_time}>"


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # present, absent, late, excused
    status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    marked_at = Column(DateTime, default=datetime.datetime.utcnow)

    schedule = relationship("Schedule", back_populates="attendances")
    student = relationship("User", foreign_keys=[student_id])
    marked_by = relationship("User", foreign_keys=[marked_by_id])

    def __repr__(self):
        return f"<Attendance schedule={self.schedule_id} student={self.student_id} status={self.status}>"
