import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)

    max_students = Column(Integer, default=12)
    schedule = Column(Text, nullable=True)  # JSON schedule

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    branch = relationship("Branch", back_populates="groups")
    teacher = relationship("User", foreign_keys=[teacher_id])
    course = relationship("Course")
    students = relationship("User", back_populates="group", foreign_keys="User.group_id")
    schedules = relationship("Schedule", back_populates="group")
    chat_room = relationship("ChatRoom", back_populates="group", uselist=False)

    def __repr__(self):
        return f"<Group {self.name}>"
