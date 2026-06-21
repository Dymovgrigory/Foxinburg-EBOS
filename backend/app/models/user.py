import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    encrypted_password = Column(Text, nullable=True)

    role = Column(String, default="student", nullable=False)
    plan = Column(String, default="FREE")
    target_language = Column(String, default="en")

    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    phone = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", use_alter=True), nullable=True)

    balance = Column(Integer, default=0)  # в копейках
    debt = Column(Integer, default=0)
    xp = Column(Integer, default=0)
    coins = Column(Integer, default=0)
    level = Column(Integer, default=1)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="users")
    branch = relationship("Branch", back_populates="users")
    group = relationship("Group", back_populates="students", foreign_keys="User.group_id")

    created_homework_reviews = relationship("HomeworkReview", foreign_keys="HomeworkReview.reviewed_by_id", back_populates="reviewer")
    submitted_homeworks = relationship("Homework", back_populates="student")
    enrollments = relationship("Enrollment", foreign_keys="Enrollment.student_id", back_populates="student")
    notifications = relationship("Notification", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
    payments = relationship("Payment", back_populates="student")
    leads = relationship("Lead", back_populates="manager")
    participations = relationship("ChatParticipant", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="sender", cascade="all, delete-orphan")
    employee_groups = relationship(
        "EmployeeGroup",
        secondary="employee_group_members",
        back_populates="members",
    )

    @property
    def plain_password(self) -> str:
        """Расшифрованный пароль для отображения в админ-панели."""
        if not self.encrypted_password:
            return ""
        # Ленивый импорт, чтобы избежать циклического импорта на старте
        from app.core.encryption import decrypt_text
        decrypted = decrypt_text(self.encrypted_password)
        return decrypted or "[ошибка расшифровки]"

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
