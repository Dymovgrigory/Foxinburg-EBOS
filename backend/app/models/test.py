import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)

    passing_score = Column(Integer, default=70)
    time_limit_minutes = Column(Integer, nullable=True)
    max_attempts = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    lesson = relationship("Lesson", back_populates="tests")
    questions = relationship(
        "TestQuestion", back_populates="test", order_by="TestQuestion.order_index",
        cascade="all, delete-orphan",
    )
    attempts = relationship(
        "TestAttempt", back_populates="test",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Test {self.title}>"


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    order_index = Column(Integer, default=0)

    question_text = Column(Text, nullable=False)
    question_type = Column(String, default="single")  # single, multiple, text, match

    # JSON с вариантами ответов и правильными ответами
    options = Column(Text, nullable=True)  # JSON string
    correct_answers = Column(Text, nullable=True)  # JSON string
    points = Column(Integer, default=1)

    test = relationship("Test", back_populates="questions")

    def __repr__(self):
        return f"<TestQuestion {self.id}>"


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    answers = Column(Text, nullable=True)  # JSON string
    score = Column(Integer, default=0)
    max_score = Column(Integer, default=0)
    is_passed = Column(Boolean, default=False)

    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    test = relationship("Test", back_populates="attempts")
    student = relationship("User", foreign_keys=[student_id])

    def __repr__(self):
        return f"<TestAttempt user={self.student_id} score={self.score}>"
