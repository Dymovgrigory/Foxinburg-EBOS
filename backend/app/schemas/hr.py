from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class StaffLeaveBase(BaseModel):
    user_id: int
    leave_type: str
    start_date: date
    end_date: date
    status: Optional[str] = "pending"
    notes: Optional[str] = None


class StaffLeaveCreate(StaffLeaveBase):
    pass


class StaffLeaveUpdate(BaseModel):
    leave_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class StaffLeaveResponse(StaffLeaveBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class StaffKpiBase(BaseModel):
    user_id: int
    period_start: date
    period_end: date
    metric: str
    target: int
    actual: int
    unit: Optional[str] = "percent"
    notes: Optional[str] = None


class StaffKpiCreate(StaffKpiBase):
    pass


class StaffKpiUpdate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    metric: Optional[str] = None
    target: Optional[int] = None
    actual: Optional[int] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class StaffKpiResponse(StaffKpiBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    completion_percent: int
    created_at: datetime
    updated_at: datetime
