from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserListResponse


class EmployeeGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    group_type: str = "internal"


class EmployeeGroupCreate(EmployeeGroupBase):
    member_ids: Optional[List[int]] = []


class EmployeeGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[str] = None


class EmployeeGroupMemberRequest(BaseModel):
    user_id: int


class EmployeeGroupEnrollRequest(BaseModel):
    course_id: int


class EmployeeGroupResponse(EmployeeGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    members: List[UserListResponse] = []
    created_at: datetime
    updated_at: datetime


class EmployeeGroupListResponse(EmployeeGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    member_count: int = 0
    created_at: datetime
    updated_at: datetime
