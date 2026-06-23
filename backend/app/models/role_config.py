from sqlalchemy import Column, Integer, String, Boolean, Text, JSON, DateTime

from app.database import Base
from app.utils import utc_now


class RoleConfig(Base):
    __tablename__ = "role_configs"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, unique=True, nullable=False, index=True)
    label = Column(String, nullable=False)
    permissions = Column(JSON, default=list, nullable=False)
    is_custom = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    def __repr__(self):
        return f"<RoleConfig {self.role}>"
