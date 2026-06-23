from datetime import date, datetime
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
    room: Optional[str] = None
    study_type: Optional[str] = "mini_group"
    language: Optional[str] = None
    level: Optional[str] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None

    academic_hour_minutes: int = 45
    balance_type: Optional[str] = "lessons"
    hourly_rate: int = 0
    monthly_fee: Optional[int] = None
    auto_invoices_enabled: bool = True
    certificates_enabled: bool = False

    schedule: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    branch_id: Optional[int] = None
    teacher_id: Optional[int] = None
    course_id: Optional[int] = None

    max_students: Optional[int] = None
    status: Optional[str] = None
    room: Optional[str] = None
    study_type: Optional[str] = None
    language: Optional[str] = None
    level: Optional[str] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None

    academic_hour_minutes: Optional[int] = None
    balance_type: Optional[str] = None
    hourly_rate: Optional[int] = None
    monthly_fee: Optional[int] = None
    auto_invoices_enabled: Optional[bool] = None
    certificates_enabled: Optional[bool] = None

    schedule: Optional[str] = None


class GroupMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class GroupResponse(GroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    students_count: Optional[int] = None
    course_title: Optional[str] = None
    teacher_name: Optional[str] = None
    branch_name: Optional[str] = None


class GroupDetailResponse(GroupResponse):
    students: list = []
    memberships: list = []


class GroupMembershipBase(BaseModel):
    student_id: int
    joined_at: date
    left_at: Optional[date] = None
    status: Optional[str] = "active"
    individual_hourly_rate: Optional[int] = None
    individual_lesson_count: Optional[int] = None
    discount_percent: int = 0
    individual_monthly_fee: Optional[int] = None
    auto_invoices_enabled: bool = True


class GroupMembershipCreate(BaseModel):
    student_id: Optional[int] = None
    joined_at: date = date.today()
    status: Optional[str] = "active"
    individual_hourly_rate: Optional[int] = None
    individual_lesson_count: Optional[int] = None
    discount_percent: int = 0
    individual_monthly_fee: Optional[int] = None
    auto_invoices_enabled: bool = True

    # Данные для создания нового ученика, если student_id не передан
    new_student_name: Optional[str] = None
    new_student_email: Optional[str] = None
    new_student_password: Optional[str] = None
    new_student_phone: Optional[str] = None


class GroupMembershipUpdate(BaseModel):
    joined_at: Optional[date] = None
    left_at: Optional[date] = None
    status: Optional[str] = None
    individual_hourly_rate: Optional[int] = None
    individual_lesson_count: Optional[int] = None
    discount_percent: Optional[int] = None
    individual_monthly_fee: Optional[int] = None
    auto_invoices_enabled: Optional[bool] = None


class StudentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    is_active: bool = True


class GroupMembershipResponse(GroupMembershipBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    student: Optional[StudentInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
