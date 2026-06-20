from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class AcademyContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_type: str
    title: Optional[str]
    file_url: Optional[str]
    external_url: Optional[str]
    order_index: int


class AcademyLessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    lesson_type: str
    order_index: int
    duration_minutes: int
    is_active: bool
    contents: List[AcademyContentResponse] = []


class AcademyModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    order_index: int
    is_active: bool
    lessons: List[AcademyLessonResponse] = []


class AcademyCourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    status: str
    is_sequential: bool
    certificate_enabled: bool
    yandex_disk_public_key: Optional[str]
    last_sync_at: Optional[datetime]
    modules: List[AcademyModuleResponse] = []


class AcademyEnrollmentRequest(BaseModel):
    student_id: int


class AcademyProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enrollment_id: int
    status: str
    progress_percent: int
    assigned_at: Optional[datetime]
    enrolled_at: datetime
    completed_at: Optional[datetime]
    modules: List[dict] = []


class AcademyModuleCompleteResponse(BaseModel):
    module_id: int
    lesson_id: int
    status: str
    progress_percent: int
    message: str
