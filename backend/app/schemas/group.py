from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    branch_id: Optional[int] = None
    teacher_id: Optional[int] = None
    course_id: Optional[int] = None
    max_students: int = 12
    status: Optional[str] = "current"
    schedule: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    teacher_id: Optional[int] = None
    course_id: Optional[int] = None
    max_students: Optional[int] = None
    status: Optional[str] = None
    schedule: Optional[str] = None


class GroupResponse(GroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    students_count: Optional[int] = None
    course_title: Optional[str] = None
