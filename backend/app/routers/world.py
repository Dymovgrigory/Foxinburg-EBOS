"""Foxinburg World — игровая вселенная для учеников.

Карта миров A1→C2, доступ по подписке (триал/платно), детали мира с уроками и
прогрессом. Завершение уроков идёт через существующий
`POST /lessons/{id}/complete` (там же начисляется XP/монеты через EventBus).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.dependencies import require_active_user, require_role
from app.core.permissions import Role
from app.core.responses import success_response, error_response
from app.models.course import Course, Module, Lesson
from app.models.enrollment import Enrollment, LessonProgress
from app.models.user import User
from app.services.subscription_service import (
    SubscriptionService, ACCESS_FULL, ACCESS_TRIAL, ACCESS_NONE,
    MONTHLY_PRICE, TRIAL_DAYS,
)
from app.services.enrollment_service import EnrollmentService
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/world", tags=["world"])


def _subscription_dict(sub) -> dict | None:
    if not sub:
        return None
    return {
        "id": sub.id,
        "plan": sub.plan,
        "status": sub.status,
        "price": sub.price,
        "currency": sub.currency,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "auto_renew": sub.auto_renew,
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
    }


def _user_stats(user: User) -> dict:
    return {
        "xp": user.xp or 0,
        "coins": user.coins or 0,
        "level": user.level or 1,
        "streak_days": user.streak_days or 0,
    }


def _is_world_unlocked(level: str, world_index: int) -> bool:
    if level == ACCESS_FULL:
        return True
    if level == ACCESS_TRIAL:
        return world_index == 0
    return False


@router.get("/map")
async def world_map(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SubscriptionService(uow)
    sub = await service.get_active_subscription(current_user.id)
    level = service.access_level(sub)
    worlds = await service.world_courses()

    # Прогресс ученика по мирам (одним запросом).
    world_ids = [w.id for w in worlds]
    enrollments = {}
    if world_ids:
        enr_result = await uow.session.execute(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id.in_(world_ids),
            )
        )
        enrollments = {e.course_id: e for e in enr_result.scalars().all()}

    items = []
    for index, world in enumerate(worlds):
        enrollment = enrollments.get(world.id)
        # Кол-во уроков и завершённых уроков
        total_result = await uow.session.execute(
            select(func.count(Lesson.id))
            .select_from(Lesson)
            .join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == world.id)
        )
        total_lessons = int(total_result.scalar() or 0)
        completed_lessons = 0
        if enrollment:
            done_result = await uow.session.execute(
                select(func.count(LessonProgress.id)).where(
                    LessonProgress.enrollment_id == enrollment.id,
                    LessonProgress.status == "completed",
                )
            )
            completed_lessons = int(done_result.scalar() or 0)
        items.append({
            "id": world.id,
            "title": world.title,
            "short_description": world.short_description,
            "cefr_level": world.cefr_level,
            "world_order": world.world_order,
            "world_theme": world.world_theme,
            "cover_url": world.cover_url,
            "unlocked": _is_world_unlocked(level, index),
            "is_demo": index == 0,
            "enrolled": enrollment is not None,
            "progress_percent": enrollment.progress_percent if enrollment else 0,
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
        })

    return success_response(
        data={
            "access_level": level,
            "subscription": _subscription_dict(sub),
            "user": _user_stats(current_user),
            "worlds": items,
            "monthly_price": MONTHLY_PRICE,
            "trial_days": TRIAL_DAYS,
            "payments_enabled": bool(settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD),
        },
        message="Карта миров Foxinburg World",
    )


@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SubscriptionService(uow)
    sub = await service.get_active_subscription(current_user.id)
    return success_response(
        data={
            "access_level": service.access_level(sub),
            "subscription": _subscription_dict(sub),
        },
        message="Статус подписки",
    )


@router.post("/trial")
async def start_trial(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SubscriptionService(uow)
    existing = await service.get_active_subscription(current_user.id)
    if existing and existing.status in ("trialing", "active"):
        return error_response("Подписка уже активна", status_code=400)
    sub = await service.start_trial(current_user)
    await uow.commit()
    await uow.session.refresh(sub)
    return success_response(
        data={"access_level": service.access_level(sub), "subscription": _subscription_dict(sub)},
        message="Бесплатный доступ активирован на 7 дней",
        status_code=201,
    )


@router.post("/subscribe")
async def subscribe_monthly(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SubscriptionService(uow)
    payments_enabled = bool(settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD)
    try:
        order = await service.create_monthly_order(current_user)
    except Exception as exc:
        await uow.rollback()
        import logging
        logging.getLogger(__name__).exception("Subscribe failed")
        return error_response(f"Не удалось оформить подписку: {exc}", status_code=502)
    await uow.commit()
    await uow.session.refresh(order)
    return success_response(
        data={
            "order_id": order.id,
            "amount": order.total_amount,
            "payment_url": order.payment_url,
            "payments_enabled": payments_enabled,
        },
        message="Заказ на подписку создан",
        status_code=201,
    )


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SubscriptionService(uow)
    sub = await service.cancel(current_user)
    if not sub:
        return error_response("Активная подписка не найдена", status_code=404)
    await uow.commit()
    await uow.session.refresh(sub)
    return success_response(
        data={"subscription": _subscription_dict(sub)},
        message="Автопродление отключено. Доступ сохранится до конца периода.",
    )


@router.post("/admin/provision")
async def provision_worlds(
    current_user: User = Depends(require_role([Role.OWNER, Role.SUPER_ADMIN])),
    uow: UnitOfWork = Depends(get_uow),
):
    """Создаёт недостающие миры A1→C2 и ачивки. Идемпотентно, безопасно на проде."""
    from app.services.world_content import ensure_world_courses, ensure_world_achievements

    created_worlds = await ensure_world_courses(uow.session)
    created_achievements = await ensure_world_achievements(uow.session)
    await uow.commit()
    return success_response(
        data={
            "created_worlds": [w.cefr_level for w in created_worlds],
            "created_achievements": created_achievements,
        },
        message="Миры Foxinburg World инициализированы",
    )


@router.get("/{course_id}")
async def world_detail(
    course_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = SubscriptionService(uow)
    sub = await service.get_active_subscription(current_user.id)
    level = service.access_level(sub)

    worlds = await service.world_courses()
    index = next((i for i, w in enumerate(worlds) if w.id == course_id), None)
    if index is None:
        return error_response("Мир не найден", status_code=404)

    if not _is_world_unlocked(level, index):
        return error_response(
            "Этот мир доступен по подписке Foxinburg World",
            status_code=403,
        )

    # Гарантируем зачисление при наличии доступа.
    enrollment_service = EnrollmentService(uow)
    enrollment = await enrollment_service.get_by_student_and_course(current_user.id, course_id)
    if not enrollment:
        enrollment = await enrollment_service.enroll_student(
            student_id=current_user.id, course_id=course_id, group_id=None
        )
        await uow.commit()

    course_result = await uow.session.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    course = course_result.scalar_one_or_none()

    progress_result = await uow.session.execute(
        select(LessonProgress).where(LessonProgress.enrollment_id == enrollment.id)
    )
    progress_by_lesson = {p.lesson_id: p for p in progress_result.scalars().all()}

    modules = []
    for module in sorted(course.modules, key=lambda m: (m.order_index or 0, m.id)):
        lessons = []
        for lesson in sorted(module.lessons, key=lambda l: (l.order_index or 0, l.id)):
            prog = progress_by_lesson.get(lesson.id)
            lessons.append({
                "id": lesson.id,
                "title": lesson.title,
                "lesson_type": lesson.lesson_type,
                "order": lesson.order_index,
                "status": prog.status if prog else "locked",
            })
        modules.append({
            "id": module.id,
            "title": module.title,
            "order": module.order_index,
            "lessons": lessons,
        })

    return success_response(
        data={
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "cefr_level": course.cefr_level,
            "world_theme": course.world_theme,
            "progress_percent": enrollment.progress_percent or 0,
            "modules": modules,
            "user": _user_stats(current_user),
        },
        message="Детали мира",
    )
