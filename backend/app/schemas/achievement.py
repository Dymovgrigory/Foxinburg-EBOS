from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AchievementBase(BaseModel):
    title: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    condition_type: str
    condition_value: Optional[int] = 1
    xp_reward: Optional[int] = 0
    coins_reward: Optional[int] = 0


class AchievementCreate(AchievementBase):
    pass


class AchievementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    condition_type: Optional[str] = None
    condition_value: Optional[int] = None
    xp_reward: Optional[int] = None
    coins_reward: Optional[int] = None


class AchievementResponse(AchievementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class UserAchievementBase(BaseModel):
    user_id: int
    achievement_id: int


class UserAchievementCreate(UserAchievementBase):
    pass


class UserAchievementResponse(UserAchievementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    earned_at: datetime
