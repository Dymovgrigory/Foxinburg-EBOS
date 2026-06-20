import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="system")  # system, homework, payment, event, achievement, schedule, chat

    # Навигация: к какой сущности относится уведомление
    link = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)  # schedule, chat, course, homework, etc.
    entity_id = Column(Integer, nullable=True)

    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification {self.title}>"
