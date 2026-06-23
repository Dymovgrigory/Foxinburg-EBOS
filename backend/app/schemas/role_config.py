from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class RoleConfigBase(BaseModel):
    role: str
    label: str
    permissions: List[str]
    is_custom: Optional[bool] = True
    is_active: Optional[bool] = True


class RoleConfigCreate(RoleConfigBase):
    pass


class RoleConfigUpdate(BaseModel):
    label: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class RoleConfigResponse(RoleConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
