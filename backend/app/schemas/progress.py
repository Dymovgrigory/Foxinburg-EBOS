from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LessonProgressBase(BaseModel):
    student_id: int
    lesson_id: int
    enrollment_id: int
    status: str


class LessonProgressCreate(LessonProgressBase):
    pass


class LessonProgressUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class LessonProgressResponse(LessonProgressBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed_at: Optional[datetime] = None
