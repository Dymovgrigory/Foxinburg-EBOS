from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FileBase(BaseModel):
    original_name: str
    storage_path: str
    public_url: Optional[str] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None


class FileCreate(FileBase):
    pass


class FileUpdate(BaseModel):
    original_name: Optional[str] = None
    storage_path: Optional[str] = None
    public_url: Optional[str] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None


class FileResponse(FileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uploaded_by_id: Optional[int] = None
    created_at: datetime
