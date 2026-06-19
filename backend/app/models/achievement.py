import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String, nullable=True)

    # Условия получения
    condition_type = Column(String, nullable=False)  # lessons_completed, tests_passed, streak, etc.
    condition_value = Column(Integer, default=1)

    xp_reward = Column(Integer, default=0)
    coins_reward = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("UserAchievement", back_populates="achievement")

    def __repr__(self):
        return f"<Achievement {self.title}>"


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)

    earned_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="users")

    def __repr__(self):
        return f"<UserAchievement user={self.user_id} achievement={self.achievement_id}>"
