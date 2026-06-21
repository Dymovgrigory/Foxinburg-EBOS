import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.database import Base


employee_group_members = Table(
    "employee_group_members",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("employee_groups.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class EmployeeGroup(Base):
    __tablename__ = "employee_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    group_type = Column(String, default="internal", nullable=False)
    # internal - сотрудники школы, external - внешние, paid - платная основа

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    members = relationship(
        "User",
        secondary=employee_group_members,
        back_populates="employee_groups",
    )

    def __repr__(self):
        return f"<EmployeeGroup {self.name}>"
