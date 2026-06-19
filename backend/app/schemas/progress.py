from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LessonProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    lesson_id: int
    enrollment_id: int
    status: str
    completed_at: Optional[datetime] = None
