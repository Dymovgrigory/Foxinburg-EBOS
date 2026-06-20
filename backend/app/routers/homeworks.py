from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.homework import Homework, HomeworkReview
from app.schemas.homework import (
    HomeworkCreate,
    HomeworkUpdate,
    HomeworkResponse,
    HomeworkReviewCreate,
    HomeworkReviewUpdate,
    HomeworkReviewResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission, has_permission

router = APIRouter(prefix="/homeworks", tags=["homeworks"])


@router.get("")
async def list_homeworks(
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    if has_permission(current_user.role, Permission.HOMEWORK_REVIEW):
        result = await db.execute(select(Homework).order_by(Homework.id.desc()))
    else:
        result = await db.execute(
            select(Homework)
            .where(Homework.student_id == current_user.id)
            .order_by(Homework.id.desc())
        )
    homeworks = result.scalars().all()
    return success_response(
        data=[HomeworkResponse.model_validate(h).model_dump() for h in homeworks],
        message="Список домашних заданий",
    )


@router.post("")
async def create_homework(
    data: HomeworkCreate,
    current_user=Depends(require_permission(Permission.HOMEWORK_REVIEW)),
    db: AsyncSession = Depends(get_db),
):
    homework = Homework(**data.model_dump())
    db.add(homework)
    await db.commit()
    await db.refresh(homework)
    return success_response(
        data=HomeworkResponse.model_validate(homework).model_dump(),
        message="Домашнее задание создано",
        status_code=201,
    )


@router.get("/{homework_id}")
async def get_homework(
    homework_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    homework = await db.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)
    return success_response(data=HomeworkResponse.model_validate(homework).model_dump())


@router.patch("/{homework_id}")
async def update_homework(
    homework_id: int,
    data: HomeworkUpdate,
    current_user=Depends(require_permission(Permission.HOMEWORK_REVIEW)),
    db: AsyncSession = Depends(get_db),
):
    homework = await db.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(homework, field, value)
    await db.commit()
    await db.refresh(homework)
    return success_response(
        data=HomeworkResponse.model_validate(homework).model_dump(),
        message="Домашнее задание обновлено",
    )


@router.post("/{homework_id}/reviews")
async def create_review(
    homework_id: int,
    data: HomeworkReviewCreate,
    current_user=Depends(require_permission(Permission.HOMEWORK_REVIEW)),
    db: AsyncSession = Depends(get_db),
):
    homework = await db.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)
    review = HomeworkReview(**data.model_dump())
    db.add(review)
    homework.status = data.status
    await db.commit()
    await db.refresh(review)
    return success_response(
        data=HomeworkReviewResponse.model_validate(review).model_dump(),
        message="Проверка сохранена",
        status_code=201,
    )


@router.get("/{homework_id}/reviews")
async def list_reviews(
    homework_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HomeworkReview).where(HomeworkReview.homework_id == homework_id).order_by(HomeworkReview.created_at.desc())
    )
    reviews = result.scalars().all()
    return success_response(
        data=[HomeworkReviewResponse.model_validate(r).model_dump() for r in reviews],
        message="История проверок",
    )
