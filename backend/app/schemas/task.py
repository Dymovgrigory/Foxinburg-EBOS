from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    creator_id: Optional[int] = None
    contact_id: Optional[int] = None
    status: Optional[str] = "planned"
    type: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    contact_id: Optional[int] = None
    status: Optional[str] = None
    type: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    assignee_name: Optional[str] = None
    creator_name: Optional[str] = None
    contact_name: Optional[str] = None
