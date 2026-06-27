"""Родительский кабинет: прогресс ребёнка в Foxinburg World, достижения,
посещаемость и финансы. Родитель видит только своих детей (User.parent_id);
управляющие роли могут смотреть карточку любого ученика.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc

from app.core.dependencies import require_active_user
from app.core.permissions import Role
from app.core.responses import success_response, error_response
from app.models.achievement import Achievement, UserAchievement
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.finance import Payment
from app.models.schedule import Attendance
from app.models.user import User
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/parent", tags=["parent"])

MANAGEMENT_ROLES = {Role.OWNER.value, Role.SUPER_ADMIN.value, Role.ADMIN.value,
                    Role.METHODIST.value, Role.MANAGER.value}


def _child_brief(child: User) -> dict:
    return {
        "id": child.id,
        "name": child.name,
        "email": child.email,
        "avatar_url": child.avatar_url,
        "level": child.level or 1,
        "xp": child.xp or 0,
        "coins": child.coins or 0,
        "streak_days": child.streak_days or 0,
    }


async def _resolve_child(uow: UnitOfWork, current_user: User, child_id: int) -> User | None:
    child = await uow.session.get(User, child_id)
    if not child:
        return None
    if current_user.role in MANAGEMENT_ROLES:
        return child
    if child.parent_id == current_user.id:
        return child
    return None


@router.get("/children")
async def list_children(
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    result = await uow.session.execute(
        select(User).where(User.parent_id == current_user.id).order_by(User.name)
    )
    children = result.scalars().all()
    return success_response(
        data=[_child_brief(c) for c in children],
        message="Дети",
        meta={"total": len(children)},
    )


@router.get("/children/{child_id}/dashboard")
async def child_dashboard(
    child_id: int,
    current_user: User = Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    child = await _resolve_child(uow, current_user, child_id)
    if not child:
        return error_response("Ученик не найден или нет доступа", status_code=404)

    # Прогресс по мирам Foxinburg World
    worlds_result = await uow.session.execute(
        select(Enrollment, Course)
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.student_id == child.id, Course.type == "student_world")
        .order_by(Course.world_order)
    )
    worlds = [
        {
            "course_id": course.id,
            "title": course.title,
            "cefr_level": course.cefr_level,
            "progress_percent": enrollment.progress_percent or 0,
            "status": enrollment.status,
        }
        for enrollment, course in worlds_result.all()
    ]

    # Достижения
    ach_result = await uow.session.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == child.id)
        .order_by(desc(UserAchievement.earned_at))
    )
    achievements = [
        {
            "id": ach.id,
            "title": ach.title,
            "description": ach.description,
            "icon_url": ach.icon_url,
            "earned_at": ua.earned_at.isoformat() if ua.earned_at else None,
        }
        for ua, ach in ach_result.all()
    ]

    # Посещаемость (сводка по статусам)
    att_result = await uow.session.execute(
        select(Attendance.status, func.count(Attendance.id))
        .where(Attendance.student_id == child.id)
        .group_by(Attendance.status)
    )
    attendance = {status: int(count) for status, count in att_result.all()}
    attendance_total = sum(attendance.values())
    attendance_present = attendance.get("present", 0) + attendance.get("late", 0)
    attendance_rate = round(attendance_present / attendance_total * 100) if attendance_total else 0

    # Финансы: баланс/долг + последние платежи
    pay_result = await uow.session.execute(
        select(Payment)
        .where(Payment.student_id == child.id)
        .order_by(desc(Payment.created_at))
        .limit(10)
    )
    payments = [
        {
            "id": p.id,
            "amount": p.amount,
            "type": p.type,
            "method": p.method,
            "status": p.status,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in pay_result.scalars().all()
    ]

    return success_response(
        data={
            "child": _child_brief(child),
            "worlds": worlds,
            "achievements": achievements,
            "attendance": {
                "by_status": attendance,
                "total": attendance_total,
                "present": attendance_present,
                "rate_percent": attendance_rate,
            },
            "finance": {
                "balance": child.balance or 0,
                "debt": child.debt or 0,
                "recent_payments": payments,
            },
        },
        message="Дашборд ученика",
    )
