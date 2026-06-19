from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = "Europe/Moscow"
    currency: Optional[str] = "RUB"
    is_active: Optional[int] = 1


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[int] = None


class OrganizationResponse(OrganizationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class BranchBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    organization_id: int
    is_active: Optional[int] = 1


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    organization_id: Optional[int] = None
    is_active: Optional[int] = None


class BranchResponse(BranchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
