from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.finance import Payment, Transaction
from app.models.crm import Lead, Deal
from app.models.enrollment import Enrollment, LessonProgress
from app.models.homework import Homework
from app.core.responses import success_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def dashboard_analytics(
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    # Users by role
    users_result = await db.execute(select(User.role, func.count(User.id)).group_by(User.role))
    users_by_role = {r: c for r, c in users_result.all()}

    # Payments
    payments_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == "completed", Payment.type == "income")
    )
    total_income = payments_result.scalar() or 0

    # Leads
    leads_result = await db.execute(select(Lead.status, func.count(Lead.id)).group_by(Lead.status))
    leads_by_status = {s: c for s, c in leads_result.all()}

    # Deals
    deals_result = await db.execute(select(Deal.status, func.count(Deal.id)).group_by(Deal.status))
    deals_by_status = {s: c for s, c in deals_result.all()}

    # Enrollments
    enrollments_result = await db.execute(select(Enrollment.status, func.count(Enrollment.id)).group_by(Enrollment.status))
    enrollments_by_status = {s: c for s, c in enrollments_result.all()}

    # Homeworks
    homeworks_result = await db.execute(select(Homework.status, func.count(Homework.id)).group_by(Homework.status))
    homeworks_by_status = {s: c for s, c in homeworks_result.all()}

    # Lesson progress
    progress_result = await db.execute(select(LessonProgress.status, func.count(LessonProgress.id)).group_by(LessonProgress.status))
    progress_by_status = {s: c for s, c in progress_result.all()}

    return success_response(
        data={
            "users_by_role": users_by_role,
            "total_income_kopecks": total_income,
            "leads_by_status": leads_by_status,
            "deals_by_status": deals_by_status,
            "enrollments_by_status": enrollments_by_status,
            "homeworks_by_status": homeworks_by_status,
            "progress_by_status": progress_by_status,
        },
        message="Аналитика дашборда",
    )


@router.get("/finance")
async def finance_analytics(
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    income_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.type == "income", Payment.status == "completed")
    )
    refund_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.type == "refund", Payment.status == "completed")
    )
    return success_response(
        data={
            "income_kopecks": income_result.scalar() or 0,
            "refund_kopecks": refund_result.scalar() or 0,
            "net_kopecks": (income_result.scalar() or 0) - (refund_result.scalar() or 0),
        },
        message="Финансовая аналитика",
    )
