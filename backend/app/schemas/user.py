from datetime import datetime, date
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
    password: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    max_user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    organization_id: Optional[int] = None
    branch_id: Optional[int] = None
    group_id: Optional[int] = None
    position: Optional[str] = None
    employment_date: Optional[date] = None
    salary_type: Optional[str] = None
    salary_rate: Optional[int] = None
    hr_status: Optional[str] = None
    contract_number: Optional[str] = None


class UserTelegramLink(BaseModel):
    telegram_chat_id: Optional[str] = None
    id: Optional[int] = None
    hash: Optional[str] = None
    auth_date: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None


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
    telegram_chat_id: Optional[str]
    max_user_id: Optional[str]
    position: Optional[str]
    employment_date: Optional[date]
    salary_type: str
    salary_rate: int
    hr_status: str
    contract_number: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]


class UserListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role: str
    plan: str
    is_active: bool
    group_id: Optional[int] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    hr_status: Optional[str] = None
    salary_rate: Optional[int] = None
    created_at: datetime
