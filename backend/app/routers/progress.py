from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.enrollment import LessonProgress
from app.schemas.progress import LessonProgressCreate, LessonProgressUpdate, LessonProgressResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_active_user

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("")
async def list_progress(
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LessonProgress).where(LessonProgress.student_id == current_user.id).order_by(LessonProgress.id.desc())
    )
    progress = result.scalars().all()
    return success_response(
        data=[LessonProgressResponse.model_validate(p).model_dump() for p in progress],
        message="Прогресс пользователя",
    )


@router.post("")
async def create_progress(
    data: LessonProgressCreate,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    progress = LessonProgress(**data.model_dump())
    db.add(progress)
    await db.commit()
    await db.refresh(progress)
    return success_response(
        data=LessonProgressResponse.model_validate(progress).model_dump(),
        message="Прогресс создан",
        status_code=201,
    )


@router.patch("/{progress_id}")
async def update_progress(
    progress_id: int,
    data: LessonProgressUpdate,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    progress = await db.get(LessonProgress, progress_id)
    if not progress:
        return error_response("Запись прогресса не найдена", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(progress, field, value)
    await db.commit()
    await db.refresh(progress)
    return success_response(
        data=LessonProgressResponse.model_validate(progress).model_dump(),
        message="Прогресс обновлён",
    )
