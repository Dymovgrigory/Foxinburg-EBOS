from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SurveyQuestionBase(BaseModel):
    text: str
    type: str = "single"
    options: List[str] = []
    order: int = 0


class SurveyQuestionCreate(SurveyQuestionBase):
    pass


class SurveyQuestionUpdate(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None
    options: Optional[List[str]] = None
    order: Optional[int] = None


class SurveyQuestionResponse(SurveyQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_active: bool = False
    target_roles: List[str] = []
    anonymous: bool = True


class SurveyCreate(SurveyBase):
    questions: List[SurveyQuestionCreate] = []


class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    target_roles: Optional[List[str]] = None
    anonymous: Optional[bool] = None


class SurveyResponseAnswer(BaseModel):
    question_id: int
    value: str


class SurveySubmit(BaseModel):
    answers: List[SurveyResponseAnswer]


class SurveyAnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    value: str


class SurveyResponseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    respondent_id: Optional[int]
    submitted_at: datetime
    answers: List[SurveyAnswerResponse]


class SurveyResponse(SurveyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    questions: List[SurveyQuestionResponse]


class SurveyListResponse(SurveyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    responses_count: int = 0
