import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(String, default="planned", nullable=False)  # planned / completed / overdue
    type = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    assignee = relationship("User", foreign_keys=[assignee_id], backref="assigned_tasks")
    creator = relationship("User", foreign_keys=[creator_id], backref="created_tasks")
    contact = relationship("User", foreign_keys=[contact_id], backref="contact_tasks")

    def __repr__(self):
        return f"<Task {self.title} {self.status}>"
