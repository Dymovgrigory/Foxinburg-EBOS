from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.achievement import Achievement, UserAchievement
from app.schemas.achievement import (
    AchievementCreate,
    AchievementUpdate,
    AchievementResponse,
    UserAchievementCreate,
    UserAchievementResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("")
async def list_achievements(
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Achievement).order_by(Achievement.created_at.desc()))
    achievements = result.scalars().all()
    return success_response(
        data=[AchievementResponse.model_validate(a).model_dump() for a in achievements],
        message="Список достижений",
    )


@router.post("")
async def create_achievement(
    data: AchievementCreate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    achievement = Achievement(**data.model_dump())
    db.add(achievement)
    await db.commit()
    await db.refresh(achievement)
    return success_response(
        data=AchievementResponse.model_validate(achievement).model_dump(),
        message="Достижение создано",
        status_code=201,
    )


@router.patch("/{achievement_id}")
async def update_achievement(
    achievement_id: int,
    data: AchievementUpdate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    achievement = await db.get(Achievement, achievement_id)
    if not achievement:
        return error_response("Достижение не найдено", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(achievement, field, value)
    await db.commit()
    await db.refresh(achievement)
    return success_response(
        data=AchievementResponse.model_validate(achievement).model_dump(),
        message="Достижение обновлено",
    )


@router.get("/my")
async def my_achievements(
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == current_user.id).order_by(UserAchievement.earned_at.desc())
    )
    user_achievements = result.scalars().all()
    return success_response(
        data=[UserAchievementResponse.model_validate(ua).model_dump() for ua in user_achievements],
        message="Мои достижения",
    )


@router.post("/{achievement_id}/award")
async def award_achievement(
    achievement_id: int,
    data: UserAchievementCreate,
    current_user=Depends(require_permission(Permission.SETTINGS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    achievement = await db.get(Achievement, achievement_id)
    if not achievement:
        return error_response("Достижение не найдено", status_code=404)
    user_achievement = UserAchievement(user_id=data.user_id, achievement_id=achievement_id)
    db.add(user_achievement)
    await db.commit()
    await db.refresh(user_achievement)
    return success_response(
        data=UserAchievementResponse.model_validate(user_achievement).model_dump(),
        message="Достижение выдано",
        status_code=201,
    )
