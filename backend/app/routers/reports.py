import csv
import io
from datetime import datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.group import Group
from app.models.schedule import Schedule
from app.models.finance import Payment, Expense, Invoice
from app.models.crm import Lead, Deal
from app.models.enrollment import Enrollment
from app.core.responses import success_response
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork
from app.services.finance_service import FinanceService
from app.services.pdf_service import generate_report_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


REPORT_TYPES = {
    "manager": "Отчет руководителя",
    "sales": "Отчет по продажам",
    "teachers": "Отчет по преподавателям",
    "students_payments": "Отчет по ученикам и оплатам",
    "students_subscriptions": "Отчет по ученикам и абонементам",
    "contracts": "Отчет по договорам",
    "accounts": "Отчет по счетам",
    "pnl": "Отчет P&L",
    "payroll": "Отчет по зарплатам",
    "expenses": "Отчет по расходам",
    "debtors": "Отчет по должникам",
}


def _parse_date(value: Optional[str], end_of_day: bool = False) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if end_of_day:
            dt = datetime.combine(dt.date(), time.max)
        return dt
    except ValueError:
        return None


def _date_filter(query, column, date_from: Optional[datetime], date_to: Optional[datetime]):
    if date_from:
        query = query.where(column >= date_from)
    if date_to:
        query = query.where(column <= date_to)
    return query


@router.get("/types")
async def report_types(
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
):
    return success_response(
        data=[{"id": k, "label": v} for k, v in REPORT_TYPES.items()],
        message="Доступные отчеты",
    )


@router.get("/manager")
async def manager_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    # Students
    students_query = select(func.count(User.id)).where(User.role == "student")
    if branch_id:
        students_query = students_query.where(User.branch_id == branch_id)
    total_students = (await db.execute(students_query)).scalar() or 0

    # Teachers
    teachers_query = select(func.count(User.id)).where(User.role == "teacher")
    if branch_id:
        teachers_query = teachers_query.where(User.branch_id == branch_id)
    total_teachers = (await db.execute(teachers_query)).scalar() or 0

    # Groups
    groups_query = select(func.count(Group.id))
    if branch_id:
        groups_query = groups_query.where(Group.branch_id == branch_id)
    total_groups = (await db.execute(groups_query)).scalar() or 0

    # Leads
    leads_query = select(func.count(Lead.id))
    leads_query = _date_filter(leads_query, Lead.created_at, df, dt)
    total_leads = (await db.execute(leads_query)).scalar() or 0

    converted_query = select(func.count(Lead.id)).where(Lead.status == "converted")
    converted_query = _date_filter(converted_query, Lead.created_at, df, dt)
    converted_leads = (await db.execute(converted_query)).scalar() or 0

    # Income / refunds
    payment_query = select(func.sum(Payment.amount)).where(Payment.status == "completed")
    payment_query = _date_filter(payment_query, Payment.created_at, df, dt)
    income_query = payment_query.where(Payment.type == "income")
    refund_query = select(func.sum(Payment.amount)).where(
        Payment.status == "completed", Payment.type == "refund"
    )
    refund_query = _date_filter(refund_query, Payment.created_at, df, dt)

    income = (await db.execute(income_query)).scalar() or 0
    refunds = (await db.execute(refund_query)).scalar() or 0

    conversion_rate = round((converted_leads / total_leads) * 100, 2) if total_leads else 0

    return success_response(
        data=[
            {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_groups": total_groups,
                "total_leads": total_leads,
                "converted_leads": converted_leads,
                "conversion_rate": conversion_rate,
                "income_kopecks": income,
                "refunds_kopecks": refunds,
                "net_kopecks": income - refunds,
            }
        ],
        message="Отчет руководителя",
    )


@router.get("/sales")
async def sales_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    # Leads by status
    leads_query = (
        select(Lead.status, func.count(Lead.id).label("count"))
        .group_by(Lead.status)
    )
    leads_query = _date_filter(leads_query, Lead.created_at, df, dt)
    leads_by_status = {row.status: row.count for row in (await db.execute(leads_query)).all()}

    # Deals by status
    deals_query = (
        select(Deal.status, func.count(Deal.id).label("count"), func.sum(Deal.amount).label("amount"))
        .group_by(Deal.status)
    )
    deals_query = _date_filter(deals_query, Deal.created_at, df, dt)
    deals_rows = (await db.execute(deals_query)).all()
    deals_by_status = {
        row.status: {"count": row.count, "amount_kopecks": row.amount or 0}
        for row in deals_rows
    }

    # Revenue by manager
    revenue_query = (
        select(
            User.id.label("manager_id"),
            User.name.label("manager_name"),
            func.count(Deal.id).label("deals_count"),
            func.sum(Deal.amount).label("revenue"),
        )
        .select_from(Lead)
        .join(Deal, Deal.lead_id == Lead.id)
        .join(User, User.id == Lead.manager_id)
        .group_by(User.id, User.name)
    )
    revenue_query = _date_filter(revenue_query, Deal.created_at, df, dt)
    revenue_rows = (await db.execute(revenue_query)).all()

    rows = [
        {
            "manager_id": row.manager_id,
            "manager_name": row.manager_name,
            "deals_count": row.deals_count,
            "revenue_kopecks": row.revenue or 0,
        }
        for row in revenue_rows
    ]

    return success_response(
        data={
            "leads_by_status": leads_by_status,
            "deals_by_status": deals_by_status,
            "manager_revenue": rows,
        },
        message="Отчет по продажам",
    )


@router.get("/teachers")
async def teachers_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    query = (
        select(
            User.id.label("teacher_id"),
            User.name.label("teacher_name"),
            func.count(Schedule.id).label("lessons_count"),
            func.sum(extract("epoch", Schedule.end_time - Schedule.start_time)).label("seconds"),
        )
        .select_from(User)
        .join(Schedule, Schedule.teacher_id == User.id)
        .where(User.role == "teacher")
        .group_by(User.id, User.name)
    )
    if branch_id:
        query = query.where(Schedule.branch_id == branch_id)
    query = _date_filter(query, Schedule.start_time, df, dt)

    rows = (await db.execute(query)).all()
    data = [
        {
            "teacher_id": row.teacher_id,
            "teacher_name": row.teacher_name,
            "lessons_count": row.lessons_count,
            "hours": round((row.seconds or 0) / 3600, 2),
        }
        for row in rows
    ]
    return success_response(data=data, message="Отчет по преподавателям")


@router.get("/students_payments")
async def students_payments_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    query = (
        select(
            User.id.label("student_id"),
            User.name.label("student_name"),
            func.count(Payment.id).label("payments_count"),
            func.sum(Payment.amount).label("total"),
        )
        .select_from(User)
        .join(Payment, Payment.student_id == User.id)
        .where(Payment.status == "completed", Payment.type == "income")
        .group_by(User.id, User.name)
    )
    if branch_id:
        query = query.where(User.branch_id == branch_id)
    query = _date_filter(query, Payment.created_at, df, dt)

    rows = (await db.execute(query)).all()
    data = [
        {
            "student_id": row.student_id,
            "student_name": row.student_name,
            "payments_count": row.payments_count,
            "total_kopecks": row.total or 0,
        }
        for row in rows
    ]
    return success_response(data=data, message="Отчет по ученикам и оплатам")


@router.get("/students_subscriptions")
async def students_subscriptions_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    query = (
        select(
            Enrollment.status,
            func.count(Enrollment.id).label("count"),
        )
        .group_by(Enrollment.status)
    )
    query = _date_filter(query, Enrollment.enrolled_at, df, dt)
    rows = (await db.execute(query)).all()
    data = [{"status": row.status, "count": row.count} for row in rows]
    return success_response(data=data, message="Отчет по ученикам и абонементам")


@router.get("/contracts")
async def contracts_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    query = (
        select(
            Deal.id,
            Deal.title,
            Deal.status,
            Deal.amount,
            Lead.name.label("lead_name"),
            User.name.label("manager_name"),
            Deal.created_at,
        )
        .select_from(Deal)
        .join(Lead, Lead.id == Deal.lead_id)
        .outerjoin(User, User.id == Lead.manager_id)
    )
    query = _date_filter(query, Deal.created_at, df, dt)

    rows = (await db.execute(query)).all()
    data = [
        {
            "deal_id": row.id,
            "title": row.title,
            "status": row.status,
            "amount_kopecks": row.amount,
            "lead_name": row.lead_name,
            "manager_name": row.manager_name,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
    return success_response(data=data, message="Отчет по договорам")


@router.get("/accounts")
async def accounts_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)

    query = (
        select(
            Payment.id,
            User.name.label("student_name"),
            Payment.amount,
            Payment.type,
            Payment.status,
            Payment.method,
            Payment.created_at,
        )
        .select_from(Payment)
        .join(User, User.id == Payment.student_id)
    )
    query = _date_filter(query, Payment.created_at, df, dt)

    rows = (await db.execute(query)).all()
    data = [
        {
            "payment_id": row.id,
            "student_name": row.student_name,
            "amount_kopecks": row.amount,
            "type": row.type,
            "status": row.status,
            "method": row.method,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
    return success_response(data=data, message="Отчет по счетам")


@router.get("/pnl")
async def pnl_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
):
    from datetime import date as dt
    today = dt.today()
    start = dt.fromisoformat(date_from) if date_from else today.replace(day=1)
    end = dt.fromisoformat(date_to) if date_to else today
    async with UnitOfWork() as uow:
        service = FinanceService(uow)
        result = await service.pnl(start, end, branch_id)
    return success_response(data=result, message="Отчет P&L")


@router.get("/payroll")
async def payroll_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt
    today = dt.today()
    start = dt.fromisoformat(date_from) if date_from else today.replace(day=1)
    end = dt.fromisoformat(date_to) if date_to else today
    teachers_query = select(User.id, User.name).where(User.role == "teacher")
    if branch_id:
        teachers_query = teachers_query.where(User.branch_id == branch_id)
    teachers_rows = (await db.execute(teachers_query)).all()
    async with UnitOfWork() as uow:
        service = FinanceService(uow)
        rows = []
        for teacher_id, teacher_name in teachers_rows:
            try:
                payroll = await service.calculate_teacher_payroll(teacher_id, start, end)
                rows.append({
                    "teacher_id": payroll["teacher_id"],
                    "teacher_name": payroll["teacher_name"],
                    "salary_type": payroll["salary_type"],
                    "rate_kopecks": payroll["rate_kopecks"],
                    "hours": payroll["total_academic_hours"],
                    "amount_kopecks": payroll["total_amount_kopecks"],
                })
            except Exception:
                continue
    return success_response(data=rows, message="Отчет по зарплатам")


@router.get("/expenses")
async def expenses_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    df = _parse_date(date_from)
    dt = _parse_date(date_to, end_of_day=True)
    query = (
        select(
            Expense.category,
            func.sum(Expense.amount).label("total"),
        )
        .where(Expense.status != "cancelled")
        .group_by(Expense.category)
    )
    if branch_id:
        query = query.where(Expense.branch_id == branch_id)
    query = _date_filter(query, Expense.expense_date, df, dt)
    rows = (await db.execute(query)).all()
    data = [{"category": row.category, "total_kopecks": row.total or 0} for row in rows]
    return success_response(data=data, message="Отчет по расходам")


@router.get("/debtors")
async def debtors_report(
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
):
    async with UnitOfWork() as uow:
        service = FinanceService(uow)
        debtors = await service.get_debtors()
    return success_response(data=debtors, message="Отчет по должникам")


@router.get("/{report_type}/export.csv")
async def export_report_csv(
    report_type: str,
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    if report_type not in REPORT_TYPES:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Тип отчета не найден")

    # Re-use report endpoints by calling inner logic directly
    if report_type == "manager":
        resp = await manager_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"] if isinstance(resp.body, dict) else []
    elif report_type == "sales":
        resp = await sales_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]["manager_revenue"]
    elif report_type == "teachers":
        resp = await teachers_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "students_payments":
        resp = await students_payments_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "students_subscriptions":
        resp = await students_subscriptions_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "contracts":
        resp = await contracts_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "accounts":
        resp = await accounts_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "pnl":
        resp = await pnl_report(branch_id, date_from, date_to, current_user)
        data = resp.body["data"]
        rows = [{"metric": k, "value_kopecks": v} for k, v in data.items()]
    elif report_type == "payroll":
        resp = await payroll_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "expenses":
        resp = await expenses_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "debtors":
        resp = await debtors_report(branch_id, date_from, date_to, current_user)
        rows = resp.body["data"]
    else:
        rows = []

    output = io.StringIO()
    writer = csv.writer(output)
    if rows:
        writer.writerow(rows[0].keys())
        for row in rows:
            writer.writerow(row.values())
    else:
        writer.writerow(["Нет данных"])

    output.seek(0)
    filename = f"report_{report_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{report_type}/export.pdf")
async def export_report_pdf(
    report_type: str,
    branch_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_permission(Permission.ANALYTICS_READ)),
    db: AsyncSession = Depends(get_db),
):
    if report_type not in REPORT_TYPES:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Тип отчета не найден")

    if report_type == "pnl":
        resp = await pnl_report(branch_id, date_from, date_to, current_user)
        data = resp.body["data"]
        rows = [{"metric": k, "value_kopecks": v} for k, v in data.items()]
    elif report_type == "payroll":
        resp = await payroll_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "expenses":
        resp = await expenses_report(branch_id, date_from, date_to, current_user, db)
        rows = resp.body["data"]
    elif report_type == "debtors":
        resp = await debtors_report(branch_id, date_from, date_to, current_user)
        rows = resp.body["data"]
    else:
        # Fallback: reuse CSV rows logic for supported types
        csv_resp = await export_report_csv(report_type, branch_id, date_from, date_to, current_user, db)
        # Convert CSV bytes back to list of dicts for PDF rendering
        content = b""
        async for chunk in csv_resp.body_iterator:
            content += chunk
        decoded = content.decode("utf-8-sig")
        reader = csv.DictReader(decoded.splitlines())
        rows = list(reader)

    title = REPORT_TYPES.get(report_type, "Отчет")
    headers = list(rows[0].keys()) if rows else ["Нет данных"]
    pdf_rows = [list(row.values()) for row in rows]
    pdf_bytes = generate_report_pdf(title, headers, pdf_rows)
    filename = f"report_{report_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
