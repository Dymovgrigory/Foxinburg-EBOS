from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    type: str = "academy"
    passing_score: int = 70
    is_sequential: bool = True
    certificate_enabled: bool = True


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    passing_score: Optional[int] = None


class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0


class ModuleCreate(ModuleBase):
    course_id: int


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    lesson_type: str = "text"
    order_index: int = 0
    duration_minutes: int = 15


class LessonCreate(LessonBase):
    module_id: int


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lesson_type: Optional[str] = None
    order_index: Optional[int] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module_id: int
    is_active: bool
    created_at: datetime


class ModuleResponse(ModuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    lessons: List[LessonResponse] = []


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    organization_id: Optional[int]
    author_id: Optional[int]
    modules: List[ModuleResponse] = []
    created_at: datetime
    updated_at: datetime
