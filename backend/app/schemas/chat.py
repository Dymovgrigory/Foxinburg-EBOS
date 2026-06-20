from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ChatParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: Optional[str] = None
    role: str
    joined_at: datetime


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    sender_id: int
    sender_name: Optional[str] = None
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool


class ChatRoomBase(BaseModel):
    name: str
    type: Optional[str] = "group"
    group_id: Optional[int] = None


class ChatRoomCreate(ChatRoomBase):
    participant_ids: Optional[List[int]] = []


class ChatRoomResponse(ChatRoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int
    created_at: datetime
    participants: Optional[List[ChatParticipantResponse]] = []


class ChatRoomListResponse(ChatRoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int
    created_at: datetime
    unread_count: Optional[int] = 0


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageUpdate(BaseModel):
    content: str
