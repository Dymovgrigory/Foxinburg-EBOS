import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    website = Column(String, nullable=True)

    timezone = Column(String, default="Europe/Moscow")
    currency = Column(String, default="RUB")

    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    branches = relationship("Branch", back_populates="organization")
    users = relationship("User", back_populates="organization")
    courses = relationship("Course", back_populates="organization")

    def __repr__(self):
        return f"<Organization {self.name}>"


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now)

    organization = relationship("Organization", back_populates="branches")
    users = relationship("User", back_populates="branch")
    groups = relationship("Group", back_populates="branch")

    def __repr__(self):
        return f"<Branch {self.name}>"
