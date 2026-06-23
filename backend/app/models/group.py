from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)

    # Основные настройки
    max_students = Column(Integer, default=12)
    status = Column(String, default="current", nullable=False)  # current / planned / closed
    room = Column(String, nullable=True)
    study_type = Column(String, default="mini_group", nullable=False)

    # Языковая школа
    language = Column(String, nullable=True)
    level = Column(String, nullable=True)

    # Сроки
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Финансовые настройки
    academic_hour_minutes = Column(Integer, default=45, nullable=False)
    balance_type = Column(String, default="lessons", nullable=False)  # lessons / rubles
    hourly_rate = Column(Integer, default=0, nullable=False)  # копейки за академический час
    monthly_fee = Column(Integer, nullable=True)  # копейки
    auto_invoices_enabled = Column(Boolean, default=True, nullable=False)
    certificates_enabled = Column(Boolean, default=False, nullable=False)

    # Legacy JSON-расписание (постепенно заменяется Schedule)
    schedule = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    branch = relationship("Branch", back_populates="groups")
    teacher = relationship("User", foreign_keys=[teacher_id])
    course = relationship("Course")
    students = relationship("User", back_populates="group", foreign_keys="User.group_id")
    schedules = relationship("Schedule", back_populates="group")
    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    chat_room = relationship("ChatRoom", back_populates="group", uselist=False)

    def __repr__(self):
        return f"<Group {self.name}>"


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    joined_at = Column(Date, nullable=False)
    left_at = Column(Date, nullable=True)
    status = Column(String, default="active", nullable=False)  # active / left / transferred

    # Индивидуальные финансовые настройки ученика в группе
    individual_hourly_rate = Column(Integer, nullable=True)  # копейки
    individual_lesson_count = Column(Integer, nullable=True)
    discount_percent = Column(Integer, default=0, nullable=False)
    individual_monthly_fee = Column(Integer, nullable=True)  # копейки
    auto_invoices_enabled = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    group = relationship("Group", back_populates="memberships")
    student = relationship("User", foreign_keys=[student_id])

    def __repr__(self):
        return f"<GroupMembership group={self.group_id} student={self.student_id}>"
