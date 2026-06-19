from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class HomeworkBase(BaseModel):
    lesson_id: int
    student_id: int
    content: Optional[str] = None
    file_urls: Optional[str] = None
    status: Optional[str] = "pending"


class HomeworkCreate(HomeworkBase):
    pass


class HomeworkUpdate(BaseModel):
    content: Optional[str] = None
    file_urls: Optional[str] = None
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None


class HomeworkResponse(HomeworkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submitted_at: Optional[datetime] = None
    created_at: datetime


class HomeworkReviewBase(BaseModel):
    homework_id: int
    reviewed_by_id: int
    status: Optional[str] = "approved"
    score: Optional[int] = None
    comment: Optional[str] = None


class HomeworkReviewCreate(HomeworkReviewBase):
    pass


class HomeworkReviewUpdate(BaseModel):
    status: Optional[str] = None
    score: Optional[int] = None
    comment: Optional[str] = None


class HomeworkReviewResponse(HomeworkReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
