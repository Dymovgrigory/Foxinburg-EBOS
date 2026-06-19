from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = "new"
    comment: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    manager_id: Optional[int] = None
    comment: Optional[str] = None


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    manager_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DealBase(BaseModel):
    lead_id: int
    title: str
    amount: Optional[int] = 0
    status: Optional[str] = "in_progress"


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    lead_id: Optional[int] = None
    title: Optional[str] = None
    amount: Optional[int] = None
    status: Optional[str] = None


class DealResponse(DealBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
