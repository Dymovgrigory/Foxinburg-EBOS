import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Homework(Base):
    __tablename__ = "homeworks"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=True)
    file_urls = Column(Text, nullable=True)  # JSON array of URLs

    status = Column(String, default="pending")  # pending, submitted, reviewed, revision
    submitted_at = Column(DateTime, nullable=True)

    lesson = relationship("Lesson", back_populates="homeworks")
    student = relationship("User", back_populates="submitted_homeworks")
    reviews = relationship("HomeworkReview", back_populates="homework")

    def __repr__(self):
        return f"<Homework lesson={self.lesson_id} student={self.student_id}>"


class HomeworkReview(Base):
    __tablename__ = "homework_reviews"

    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey("homeworks.id"), nullable=False)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(String, default="approved")  # approved, rejected, revision
    score = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    homework = relationship("Homework", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewed_by_id], back_populates="created_homework_reviews")

    def __repr__(self):
        return f"<HomeworkReview {self.status}>"
