from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DirectoryBase(BaseModel):
    kind: str
    name: str
    is_active: Optional[bool] = True
    sort_order: Optional[int] = 0


class DirectoryCreate(DirectoryBase):
    pass


class DirectoryUpdate(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class DirectoryResponse(DirectoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
