from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class EnrollmentBase(BaseModel):
    student_id: int
    course_id: int
    group_id: Optional[int] = None


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentResponse(EnrollmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    progress_percent: int
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
