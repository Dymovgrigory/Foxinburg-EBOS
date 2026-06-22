from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class KnowledgeArticleBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[str] = None  # JSON-строка
    is_published: bool = True


class KnowledgeArticleCreate(KnowledgeArticleBase):
    pass


class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    is_published: Optional[bool] = None


class KnowledgeArticleResponse(KnowledgeArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
