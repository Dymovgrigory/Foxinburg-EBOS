from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    title: str
    message: str
    type: Optional[str] = "system"
    link: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None


class NotificationCreate(BaseModel):
    user_ids: List[int]
    title: str
    message: str
    type: Optional[str] = "system"
    link: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    is_read: bool
    read_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
