"""Геймификация Foxinburg World: XP, монеты, уровни, ежедневный стрик, ачивки.

Начисления выполняются событийно (через EventBus) после завершения урока,
успешного теста и принятого домашнего задания, чтобы не дублировать логику
прогресса. Уровень вычисляется детерминированно из накопленного XP.
"""
import logging
from datetime import timedelta
from typing import List

from sqlalchemy import select, func

from app.models.user import User
from app.models.enrollment import LessonProgress
from app.models.test import TestAttempt
from app.models.achievement import Achievement, UserAchievement
from app.services.unit_of_work import UnitOfWork
from app.core.events import EventBus, SystemEventType
from app.utils import utc_now

logger = logging.getLogger(__name__)

# Награды за активности (XP, монеты)
REWARD_LESSON_COMPLETED = (20, 5)
REWARD_TEST_PASSED = (30, 10)
REWARD_HOMEWORK_APPROVED = (25, 10)

# Каждые XP_PER_LEVEL очков опыта = +1 уровень
XP_PER_LEVEL = 100


def level_for_xp(xp: int) -> int:
    """Уровень из накопленного XP (1-based)."""
    if xp < 0:
        xp = 0
    return xp // XP_PER_LEVEL + 1


def xp_to_next_level(xp: int) -> int:
    """Сколько XP осталось до следующего уровня."""
    current = level_for_xp(xp)
    next_threshold = current * XP_PER_LEVEL
    return max(0, next_threshold - xp)


class GamificationService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def _get_user(self, user_id: int) -> User | None:
        return await self.uow.session.get(User, user_id)

    async def award(self, user: User, xp: int, coins: int) -> None:
        user.xp = (user.xp or 0) + xp
        user.coins = (user.coins or 0) + coins
        user.level = level_for_xp(user.xp)

    async def register_activity(self, user: User) -> None:
        """Обновляет ежедневный стрик активности."""
        today = utc_now().date()
        last = user.last_activity_date
        if last == today:
            return
        if last == today - timedelta(days=1):
            user.streak_days = (user.streak_days or 0) + 1
        else:
            user.streak_days = 1
        user.last_activity_date = today

    async def count_completed_lessons(self, user_id: int) -> int:
        result = await self.uow.session.execute(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.student_id == user_id,
                LessonProgress.status == "completed",
            )
        )
        return int(result.scalar() or 0)

    async def count_passed_tests(self, user_id: int) -> int:
        result = await self.uow.session.execute(
            select(func.count(func.distinct(TestAttempt.test_id))).where(
                TestAttempt.student_id == user_id,
                TestAttempt.is_passed == True,  # noqa: E712
            )
        )
        return int(result.scalar() or 0)

    async def evaluate_achievements(self, user: User) -> List[Achievement]:
        """Проверяет условия ачивок и выдаёт недостающие. Возвращает новые."""
        earned_result = await self.uow.session.execute(
            select(UserAchievement.achievement_id).where(
                UserAchievement.user_id == user.id
            )
        )
        earned_ids = set(earned_result.scalars().all())

        all_result = await self.uow.session.execute(select(Achievement))
        achievements = all_result.scalars().all()
        if not achievements:
            return []

        lessons_done = await self.count_completed_lessons(user.id)
        tests_done = await self.count_passed_tests(user.id)

        metric_for = {
            "lessons_completed": lessons_done,
            "tests_passed": tests_done,
            "streak": user.streak_days or 0,
            "level": user.level or 1,
        }

        newly_earned: List[Achievement] = []
        for ach in achievements:
            if ach.id in earned_ids:
                continue
            metric = metric_for.get(ach.condition_type)
            if metric is None:
                continue
            if metric >= (ach.condition_value or 1):
                self.uow.session.add(
                    UserAchievement(user_id=user.id, achievement_id=ach.id)
                )
                await self.award(user, ach.xp_reward or 0, ach.coins_reward or 0)
                newly_earned.append(ach)

        if newly_earned:
            await self.uow.session.flush()
            for ach in newly_earned:
                await EventBus.publish(
                    self.uow,
                    SystemEventType.ACHIEVEMENT_EARNED,
                    {"user_id": user.id, "achievement_id": ach.id, "title": ach.title},
                    user_id=user.id,
                )
        return newly_earned

    async def reward_activity(self, user_id: int, xp: int, coins: int) -> None:
        """Базовый сценарий: начислить награду, обновить стрик, выдать ачивки."""
        user = await self._get_user(user_id)
        if not user:
            return
        await self.award(user, xp, coins)
        await self.register_activity(user)
        await self.evaluate_achievements(user)
        await self.uow.session.flush()
