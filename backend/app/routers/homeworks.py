import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.models.homework import Homework, HomeworkReview
from app.models.user import User
from app.schemas.homework import (
    HomeworkCreate,
    HomeworkUpdate,
    HomeworkResponse,
    HomeworkSubmitRequest,
    HomeworkReviewCreate,
    HomeworkReviewUpdate,
    HomeworkReviewResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission, has_permission
from app.core.events import EventBus, SystemEventType
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/homeworks", tags=["homeworks"])


def _review_status_to_homework_status(review_status: str) -> str:
    """Переводит статус проверки в статус домашнего задания."""
    mapping = {
        "approved": "reviewed",
        "rejected": "rejected",
        "revision": "revision",
    }
    return mapping.get(review_status, review_status)


@router.get("")
async def list_homeworks(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    if has_permission(current_user.role, Permission.HOMEWORK_REVIEW):
        result = await uow.session.execute(select(Homework).order_by(Homework.id.desc()))
    else:
        result = await uow.session.execute(
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
    uow: UnitOfWork = Depends(get_uow),
):
    homework = Homework(**data.model_dump())
    uow.session.add(homework)
    await uow.commit()
    await uow.session.refresh(homework)
    return success_response(
        data=HomeworkResponse.model_validate(homework).model_dump(),
        message="Домашнее задание создано",
        status_code=201,
    )


@router.get("/{homework_id}")
async def get_homework(
    homework_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    homework = await uow.session.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)
    if not has_permission(current_user.role, Permission.HOMEWORK_REVIEW):
        if homework.student_id != current_user.id:
            return error_response("Доступ запрещён", status_code=403)
    return success_response(data=HomeworkResponse.model_validate(homework).model_dump())


@router.patch("/{homework_id}")
async def update_homework(
    homework_id: int,
    data: HomeworkUpdate,
    current_user=Depends(require_permission(Permission.HOMEWORK_REVIEW)),
    uow: UnitOfWork = Depends(get_uow),
):
    homework = await uow.session.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(homework, field, value)
    await uow.commit()
    await uow.session.refresh(homework)
    return success_response(
        data=HomeworkResponse.model_validate(homework).model_dump(),
        message="Домашнее задание обновлено",
    )


@router.post("/{homework_id}/submit")
async def submit_homework(
    homework_id: int,
    data: HomeworkSubmitRequest,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Студент сохраняет ответ и отправляет задание на проверку."""
    homework = await uow.session.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)
    if homework.student_id != current_user.id:
        return error_response("Можно отправлять только свои задания", status_code=403)

    if data.content is not None:
        homework.content = data.content
    if data.file_urls is not None:
        homework.file_urls = data.file_urls
    homework.status = "submitted"
    homework.submitted_at = datetime.datetime.utcnow()

    await uow.commit()
    await uow.session.refresh(homework)

    await EventBus.publish(
        uow,
        SystemEventType.HOMEWORK_SUBMITTED,
        {"homework_id": homework.id, "student_id": current_user.id},
        user_id=current_user.id,
    )

    return success_response(
        data=HomeworkResponse.model_validate(homework).model_dump(),
        message="Домашнее задание отправлено на проверку",
    )


@router.post("/{homework_id}/reviews")
async def create_review(
    homework_id: int,
    data: HomeworkReviewCreate,
    current_user=Depends(require_permission(Permission.HOMEWORK_REVIEW)),
    uow: UnitOfWork = Depends(get_uow),
):
    homework = await uow.session.get(Homework, homework_id)
    if not homework:
        return error_response("Домашнее задание не найдено", status_code=404)

    review = HomeworkReview(
        homework_id=homework_id,
        reviewed_by_id=current_user.id,
        status=data.status,
        score=data.score,
        comment=data.comment,
    )
    uow.session.add(review)
    homework.status = _review_status_to_homework_status(data.status)
    await uow.commit()
    await uow.session.refresh(review)

    await EventBus.publish(
        uow,
        SystemEventType.HOMEWORK_REVIEWED,
        {
            "homework_id": homework.id,
            "review_id": review.id,
            "status": review.status,
        },
        user_id=current_user.id,
    )

    return success_response(
        data=HomeworkReviewResponse.model_validate(review).model_dump(),
        message="Проверка сохранена",
        status_code=201,
    )


@router.get("/{homework_id}/reviews")
async def list_reviews(
    homework_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(HomeworkReview).where(HomeworkReview.homework_id == homework_id).order_by(HomeworkReview.created_at.desc())
    )
    reviews = result.scalars().all()
    return success_response(
        data=[HomeworkReviewResponse.model_validate(r).model_dump() for r in reviews],
        message="История проверок",
    )
