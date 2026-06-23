from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    target_roles = Column(JSON, default=list, nullable=False)
    anonymous = Column(Boolean, default=True, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan")
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<Survey {self.title}>"


class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    text = Column(String, nullable=False)
    type = Column(String, default="single", nullable=False)  # single, text, rating
    options = Column(JSON, default=list, nullable=False)
    order = Column(Integer, default=0, nullable=False)

    survey = relationship("Survey", back_populates="questions")
    answers = relationship("SurveyAnswer", back_populates="question", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SurveyQuestion {self.text}>"


class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    respondent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, default=utc_now)

    survey = relationship("Survey", back_populates="responses")
    respondent = relationship("User", foreign_keys=[respondent_id])
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SurveyResponse {self.id}>"


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("survey_responses.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("survey_questions.id"), nullable=False)
    value = Column(Text, nullable=False)

    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")

    def __repr__(self):
        return f"<SurveyAnswer {self.value}>"
