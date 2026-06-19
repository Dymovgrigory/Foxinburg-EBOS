from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "student"
    plan: str = "FREE"
    target_language: str = "en"
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    organization_id: Optional[int] = None
    branch_id: Optional[int] = None
    group_id: Optional[int] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    is_verified: bool
    balance: int
    debt: int
    xp: int
    coins: int
    level: int
    organization_id: Optional[int]
    branch_id: Optional[int]
    group_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]


class UserListResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    plan: str
    is_active: bool
    created_at: datetime
