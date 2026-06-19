from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    lesson_id: int
    passing_score: Optional[int] = 70
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = 3
    is_active: Optional[bool] = True


class TestCreate(TestBase):
    pass


class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lesson_id: Optional[int] = None
    passing_score: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    is_active: Optional[bool] = None


class TestResponse(TestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class TestQuestionBase(BaseModel):
    test_id: int
    order_index: Optional[int] = 0
    question_text: str
    question_type: Optional[str] = "single"
    options: Optional[str] = None
    correct_answers: Optional[str] = None
    points: Optional[int] = 1


class TestQuestionCreate(TestQuestionBase):
    pass


class TestQuestionUpdate(BaseModel):
    order_index: Optional[int] = None
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[str] = None
    correct_answers: Optional[str] = None
    points: Optional[int] = None


class TestQuestionResponse(TestQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TestAttemptBase(BaseModel):
    test_id: int
    student_id: int
    answers: Optional[str] = None
    score: Optional[int] = 0
    max_score: Optional[int] = 0
    is_passed: Optional[bool] = False


class TestAttemptCreate(BaseModel):
    answers: Optional[str] = None


class TestAttemptUpdate(BaseModel):
    answers: Optional[str] = None
    score: Optional[int] = None
    max_score: Optional[int] = None
    is_passed: Optional[bool] = None
    finished_at: Optional[datetime] = None


class TestAttemptResponse(TestAttemptBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
