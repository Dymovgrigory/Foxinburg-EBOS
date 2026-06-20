import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    status = Column(String, default="active")  # active, completed, dropped, paused
    progress_percent = Column(Integer, default=0)

    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, nullable=True)

    enrolled_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    student = relationship("User", foreign_keys=[student_id], back_populates="enrollments")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    course = relationship("Course", back_populates="enrollments")
    group = relationship("Group")

    def __repr__(self):
        return f"<Enrollment student={self.student_id} course={self.course_id}>"


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)

    status = Column(String, default="locked")  # locked, available, in_progress, completed
    completed_at = Column(DateTime, nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    lesson = relationship("Lesson", foreign_keys=[lesson_id])
    enrollment = relationship("Enrollment", foreign_keys=[enrollment_id])

    def __repr__(self):
        return f"<LessonProgress lesson={self.lesson_id} status={self.status}>"
