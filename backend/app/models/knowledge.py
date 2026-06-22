import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utc_now


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    tags = Column(String, nullable=True)  # JSON-строка со списком тегов
    is_published = Column(Boolean, default=True, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    author = relationship("User")
