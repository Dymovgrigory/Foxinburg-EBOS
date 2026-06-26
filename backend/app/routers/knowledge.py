from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.dependencies import require_active_user, require_permission
from app.core.permissions import Permission, has_permission
from app.core.responses import success_response, error_response
from app.models.knowledge import KnowledgeArticle
from app.schemas.knowledge import KnowledgeArticleCreate, KnowledgeArticleUpdate, KnowledgeArticleResponse
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
async def list_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(KnowledgeArticle)
    if not has_permission(current_user.role, Permission.COURSE_UPDATE):
        query = query.where(KnowledgeArticle.is_published == True)
    if category:
        query = query.where(KnowledgeArticle.category == category)
    if search:
        query = query.where(
            KnowledgeArticle.title.ilike(f"%{search}%")
            | KnowledgeArticle.content.ilike(f"%{search}%")
        )
    query = query.order_by(KnowledgeArticle.created_at.desc())
    result = await db.execute(query)
    articles = result.scalars().all()
    return success_response(
        data=[KnowledgeArticleResponse.model_validate(a).model_dump() for a in articles],
        message="Статьи базы знаний",
        meta={"total": len(articles)},
    )


@router.get("/{article_id}")
async def get_article(
    article_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    article = await db.get(KnowledgeArticle, article_id)
    can_manage = has_permission(current_user.role, Permission.COURSE_UPDATE)
    if not article or (not article.is_published and not can_manage):
        return error_response("Статья не найдена", status_code=404)
    return success_response(
        data=KnowledgeArticleResponse.model_validate(article).model_dump(),
        message="Статья",
    )


@router.post("")
async def create_article(
    data: KnowledgeArticleCreate,
    current_user=Depends(require_permission(Permission.COURSE_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    article = KnowledgeArticle(**data.model_dump(), author_id=current_user.id)
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return success_response(
        data=KnowledgeArticleResponse.model_validate(article).model_dump(),
        message="Статья создана",
        status_code=201,
    )


@router.patch("/{article_id}")
async def update_article(
    article_id: int,
    data: KnowledgeArticleUpdate,
    current_user=Depends(require_permission(Permission.COURSE_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    article = await db.get(KnowledgeArticle, article_id)
    if not article:
        return error_response("Статья не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(article, field, value)
    await db.commit()
    await db.refresh(article)
    return success_response(
        data=KnowledgeArticleResponse.model_validate(article).model_dump(),
        message="Статья обновлена",
    )


@router.delete("/{article_id}")
async def delete_article(
    article_id: int,
    current_user=Depends(require_permission(Permission.COURSE_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    article = await db.get(KnowledgeArticle, article_id)
    if not article:
        return error_response("Статья не найдена", status_code=404)
    await db.delete(article)
    await db.commit()
    return success_response(message="Статья удалена")
