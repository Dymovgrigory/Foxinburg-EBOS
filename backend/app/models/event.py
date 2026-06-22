import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False, index=True)
    payload = Column(Text, nullable=True)  # JSON
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<SystemEvent {self.type}>"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type = Column(String, nullable=False)  # user, course, lesson, etc.
    entity_id = Column(Integer, nullable=True)
    old_values = Column(Text, nullable=True)  # JSON
    new_values = Column(Text, nullable=True)  # JSON
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity_type}>"
