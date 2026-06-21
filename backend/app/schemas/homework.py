from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class HomeworkBase(BaseModel):
    lesson_id: int
    student_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    file_urls: Optional[str] = None  # JSON-строка со списком URL
    status: Optional[str] = "assigned"


class HomeworkCreate(HomeworkBase):
    pass


class HomeworkUpdate(BaseModel):
    content: Optional[str] = None
    file_urls: Optional[str] = None
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None


class HomeworkSubmitRequest(BaseModel):
    content: Optional[str] = None
    file_urls: Optional[str] = None  # JSON-строка со списком URL


class HomeworkAssignToLesson(BaseModel):
    lesson_id: int
    group_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    file_urls: Optional[str] = None


class HomeworkResponse(HomeworkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submitted_at: Optional[datetime] = None
    created_at: datetime


class HomeworkReviewBase(BaseModel):
    status: str = "approved"  # approved, rejected, revision
    score: Optional[int] = None
    comment: Optional[str] = None


class HomeworkReviewCreate(HomeworkReviewBase):
    pass


class HomeworkReviewUpdate(BaseModel):
    status: Optional[str] = None
    score: Optional[int] = None
    comment: Optional[str] = None


class HomeworkReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    homework_id: int
    reviewed_by_id: int
    status: str
    score: Optional[int]
    comment: Optional[str]
    created_at: datetime
