from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.homework import HomeworkResponse
from app.schemas.test import TestAttemptResponse
from app.schemas.progress import LessonProgressResponse


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
    short_description: Optional[str] = None
    status: Optional[str] = None
    passing_score: Optional[int] = None
    is_sequential: Optional[bool] = None
    certificate_enabled: Optional[bool] = None


class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0


class ModuleCreate(ModuleBase):
    course_id: int


class ModuleReorderRequest(BaseModel):
    course_id: int
    module_ids: List[int]


class LessonReorderRequest(BaseModel):
    module_id: int
    lesson_ids: List[int]


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


# ---------- Вложенные схемы для форматов урока ----------

class TestQuestionConfigCreate(BaseModel):
    question_text: str
    question_type: str = "single"
    options: Optional[str] = None  # JSON
    correct_answers: Optional[str] = None  # JSON
    points: int = 1
    order_index: int = 0


class TestConfigCreate(BaseModel):
    title: str
    description: Optional[str] = None
    passing_score: int = 70
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 3
    questions: List[TestQuestionConfigCreate] = []


class TestQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    test_id: int
    question_text: str
    question_type: str
    options: Optional[str] = None
    correct_answers: Optional[str] = None
    points: int
    order_index: int


class LessonTestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    passing_score: int
    time_limit_minutes: Optional[int] = None
    max_attempts: int
    is_active: bool
    questions: List[TestQuestionResponse] = []


class HomeworkConfigCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


# ---------- Основные схемы урока ----------

class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    lesson_type: str = "text"
    order_index: int = 0
    duration_minutes: int = 15
    homework_title: Optional[str] = None
    homework_description: Optional[str] = None


class LessonCreate(LessonBase):
    module_id: int
    test: Optional[TestConfigCreate] = None
    homework: Optional[HomeworkConfigCreate] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lesson_type: Optional[str] = None
    order_index: Optional[int] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    homework_title: Optional[str] = None
    homework_description: Optional[str] = None
    test: Optional[TestConfigCreate] = None
    homework: Optional[HomeworkConfigCreate] = None


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LessonContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content_type: str
    title: Optional[str] = None
    body: Optional[str] = None
    file_url: Optional[str] = None
    external_url: Optional[str] = None
    order_index: int = 0


class LessonDetailResponse(LessonResponse):
    test: Optional[LessonTestResponse] = None
    contents: List[LessonContentResponse] = []


class TestQuestionPlayerResponse(BaseModel):
    """Вопрос теста без правильных ответов — для прохождения урока."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    test_id: int
    question_text: str
    question_type: str
    options: Optional[str] = None
    points: int
    order_index: int


class LessonTestPlayerResponse(BaseModel):
    """Тест урока без правильных ответов — для прохождения урока."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    passing_score: int
    time_limit_minutes: Optional[int] = None
    max_attempts: int
    is_active: bool
    questions: List[TestQuestionPlayerResponse] = []


class LessonPlayerLessonResponse(LessonResponse):
    """Урок, отдаваемый в плеере."""
    test: Optional[LessonTestPlayerResponse] = None
    contents: List[LessonContentResponse] = []


class LessonPlayerResponse(BaseModel):
    """Полный ответ плеера урока."""
    lesson: LessonPlayerLessonResponse
    progress: Optional[LessonProgressResponse] = None
    homework: Optional[HomeworkResponse] = None
    latest_test_attempt: Optional[TestAttemptResponse] = None
    can_complete: bool = False
    is_locked: bool = False


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
