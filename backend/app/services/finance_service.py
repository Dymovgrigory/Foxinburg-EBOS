from typing import List, Optional
from datetime import datetime, date, timedelta
from sqlalchemy import select, func, and_

from app.models.finance import Payment, Transaction, Invoice, Expense, Subscription
from app.models.user import User
from app.models.group import Group, GroupMembership
from app.models.schedule import Schedule, Attendance
from app.models.organization import Branch
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.utils import utc_now


class FinanceService(BaseService[Payment]):
    model = Payment

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    # ---------- Invoices ----------

    async def create_invoice(self, data: dict) -> Invoice:
        invoice = Invoice(**data)
        self.uow.session.add(invoice)
        await self.uow.session.flush()
        await self.uow.session.refresh(invoice)
        return invoice

    async def list_invoices(self, *, student_id: Optional[int] = None, group_id: Optional[int] = None, status: Optional[str] = None) -> List[Invoice]:
        query = select(Invoice)
        filters = []
        if student_id:
            filters.append(Invoice.student_id == student_id)
        if group_id:
            filters.append(Invoice.group_id == group_id)
        if status:
            filters.append(Invoice.status == status)
        if filters:
            query = query.where(and_(*filters))
        result = await self.uow.session.execute(query.order_by(Invoice.created_at.desc()))
        return list(result.scalars().all())

    async def get_invoice(self, invoice_id: int) -> Optional[Invoice]:
        result = await self.uow.session.execute(select(Invoice).where(Invoice.id == invoice_id))
        return result.scalar_one_or_none()

    async def update_invoice(self, invoice: Invoice, data: dict) -> Invoice:
        for field, value in data.items():
            setattr(invoice, field, value)
        await self.uow.session.flush()
        await self.uow.session.refresh(invoice)
        return invoice

    async def delete_invoice(self, invoice: Invoice) -> None:
        await self.uow.session.delete(invoice)
        await self.uow.session.flush()

    async def generate_group_invoices(
        self,
        group_id: int,
        period_start: date,
        period_end: date,
        due_date: Optional[date] = None,
    ) -> List[Invoice]:
        group = await self.uow.session.get(Group, group_id)
        if not group:
            raise ValueError("Группа не найдена")

        memberships_result = await self.uow.session.execute(
            select(GroupMembership)
            .where(GroupMembership.group_id == group_id, GroupMembership.status == "active")
            .order_by(GroupMembership.id)
        )
        memberships = list(memberships_result.scalars().all())

        invoices: List[Invoice] = []
        for membership in memberships:
            amount = self._calculate_membership_amount(membership, group, period_start, period_end)
            invoice = Invoice(
                student_id=membership.student_id,
                group_id=group_id,
                membership_id=membership.id,
                amount=amount,
                status="draft",
                due_date=due_date or period_end + timedelta(days=3),
                period_start=period_start,
                period_end=period_end,
                description=f"Оплата за период {period_start:%d.%m.%Y} – {period_end:%d.%m.%Y}",
            )
            self.uow.session.add(invoice)
            invoices.append(invoice)

        await self.uow.session.flush()
        for invoice in invoices:
            await self.uow.session.refresh(invoice)
        return invoices

    def _calculate_membership_amount(self, membership: GroupMembership, group: Group, period_start: date, period_end: date) -> int:
        # Приоритет индивидуальным настройкам
        if membership.individual_monthly_fee:
            return membership.individual_monthly_fee
        if group.monthly_fee:
            return group.monthly_fee
        # Иначе почасовой расчёт: количество занятий в периоде × ставка × (1 - скидка)
        # Позже можно заменить на точный подсчёт Schedule, пока упрощённо — 4 недели
        lessons_per_month = 8  # условно 2 занятия в неделю
        rate = membership.individual_hourly_rate or group.hourly_rate or 0
        academic_hours = group.academic_hour_minutes / 60
        discount = membership.discount_percent or 0
        amount = int(lessons_per_month * rate * academic_hours * (100 - discount) / 100)
        return amount

    async def pay_invoice(self, invoice_id: int, amount: int, method: str = "cash", description: Optional[str] = None) -> Payment:
        invoice = await self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError("Счёт не найден")
        if invoice.status == "paid":
            raise ValueError("Счёт уже оплачен")

        student = await self.uow.session.get(User, invoice.student_id)
        if not student:
            raise ValueError("Ученик не найден")

        payment = Payment(
            student_id=invoice.student_id,
            invoice_id=invoice.id,
            group_id=invoice.group_id,
            amount=amount,
            type="income",
            method=method,
            status="completed",
            period_start=invoice.period_start,
            period_end=invoice.period_end,
            description=description or f"Оплата счёта #{invoice.id}",
        )
        self.uow.session.add(payment)

        new_balance = (student.balance or 0) + amount
        student.balance = new_balance

        transaction = Transaction(
            user_id=student.id,
            amount=amount,
            type="payment",
            balance_after=new_balance,
            description=description or f"Оплата счёта #{invoice.id}",
        )
        self.uow.session.add(transaction)

        invoice.status = "paid"
        invoice.paid_at = utc_now()
        await self.uow.session.flush()
        await self.uow.session.refresh(payment)
        return payment

    async def get_debtors(self) -> List[dict]:
        result = await self.uow.session.execute(
            select(Invoice, User)
            .join(User, Invoice.student_id == User.id)
            .where(Invoice.status.in_(["draft", "sent", "overdue"]))
            .order_by(User.name)
        )
        by_student: dict = {}
        for invoice, user in result.all():
            if user.id not in by_student:
                by_student[user.id] = {"student_id": user.id, "student_name": user.name, "total_debt_kopecks": 0, "invoices": []}
            by_student[user.id]["total_debt_kopecks"] += invoice.amount
            by_student[user.id]["invoices"].append(invoice)
        return list(by_student.values())

    # ---------- Expenses ----------

    async def create_expense(self, data: dict, created_by_id: Optional[int] = None) -> Expense:
        expense = Expense(**data, created_by_id=created_by_id)
        self.uow.session.add(expense)
        await self.uow.session.flush()
        await self.uow.session.refresh(expense)
        return expense

    async def list_expenses(
        self,
        *,
        branch_id: Optional[int] = None,
        category: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[Expense]:
        query = select(Expense).where(Expense.status != "cancelled")
        filters = []
        if branch_id:
            filters.append(Expense.branch_id == branch_id)
        if category:
            filters.append(Expense.category == category)
        if date_from:
            filters.append(Expense.expense_date >= date_from)
        if date_to:
            filters.append(Expense.expense_date <= date_to)
        if filters:
            query = query.where(and_(*filters))
        result = await self.uow.session.execute(query.order_by(Expense.expense_date.desc()))
        return list(result.scalars().all())

    async def get_expense(self, expense_id: int) -> Optional[Expense]:
        result = await self.uow.session.execute(select(Expense).where(Expense.id == expense_id))
        return result.scalar_one_or_none()

    async def update_expense(self, expense: Expense, data: dict) -> Expense:
        for field, value in data.items():
            setattr(expense, field, value)
        await self.uow.session.flush()
        await self.uow.session.refresh(expense)
        return expense

    async def delete_expense(self, expense: Expense) -> None:
        await self.uow.session.delete(expense)
        await self.uow.session.flush()

    # ---------- Payroll ----------

    async def calculate_teacher_payroll(
        self,
        teacher_id: int,
        from_date: date,
        to_date: date,
    ) -> dict:
        teacher = await self.uow.session.get(User, teacher_id)
        if not teacher:
            raise ValueError("Преподаватель не найден")

        salary_type = teacher.salary_type or "hourly"
        rate = teacher.salary_rate or 0

        # Common: list completed lessons for reference
        schedules_result = await self.uow.session.execute(
            select(Schedule, Group)
            .join(Group, Schedule.group_id == Group.id, isouter=True)
            .where(
                Schedule.teacher_id == teacher_id,
                Schedule.status == "completed",
                func.date(Schedule.start_time) >= from_date,
                func.date(Schedule.start_time) <= to_date,
            )
            .order_by(Schedule.start_time)
        )

        lessons = []
        total_hours = 0.0
        for schedule, group in schedules_result.all():
            academic_minutes = group.academic_hour_minutes if group else 45
            duration_minutes = (schedule.end_time - schedule.start_time).total_seconds() / 60
            hours = duration_minutes / academic_minutes
            total_hours += hours
            lessons.append({
                "schedule_id": schedule.id,
                "title": schedule.title,
                "group_name": group.name if group else None,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
                "academic_hours": round(hours, 2),
                "amount_kopecks": 0,
            })

        total_amount = 0
        if salary_type == "hourly":
            total_amount = int(total_hours * rate)
            for lesson in lessons:
                lesson["amount_kopecks"] = int(lesson["academic_hours"] * rate)
        elif salary_type == "fixed":
            total_amount = rate
        elif salary_type == "percent":
            # Revenue from teacher's groups in period
            group_ids = list({lesson["group_name"] for lesson in lessons if lesson.get("group_name")})
            # Fetch actual group ids from schedules
            schedule_ids = [lesson["schedule_id"] for lesson in lessons]
            group_id_rows = await self.uow.session.execute(
                select(Schedule.group_id).where(Schedule.id.in_(schedule_ids))
            )
            group_ids = [row[0] for row in group_id_rows.all() if row[0]]
            revenue = 0
            if group_ids:
                revenue_result = await self.uow.session.execute(
                    select(func.sum(Payment.amount)).where(
                        Payment.type == "income",
                        Payment.status == "completed",
                        Payment.group_id.in_(group_ids),
                        func.date(Payment.created_at) >= from_date,
                        func.date(Payment.created_at) <= to_date,
                    )
                )
                revenue = revenue_result.scalar() or 0
            total_amount = int(revenue * rate / 100)

        return {
            "teacher_id": teacher.id,
            "teacher_name": teacher.name,
            "salary_type": salary_type,
            "period_start": from_date,
            "period_end": to_date,
            "rate_kopecks": rate,
            "total_academic_hours": round(total_hours, 2),
            "total_amount_kopecks": total_amount,
            "lessons": lessons,
        }

    # ---------- P&L ----------

    async def pnl(self, from_date: date, to_date: date, branch_id: Optional[int] = None) -> dict:
        income_result = await self.uow.session.execute(
            select(func.sum(Payment.amount)).where(
                Payment.type == "income",
                Payment.status == "completed",
                func.date(Payment.created_at) >= from_date,
                func.date(Payment.created_at) <= to_date,
            )
        )
        income = income_result.scalar() or 0

        refund_result = await self.uow.session.execute(
            select(func.sum(Payment.amount)).where(
                Payment.type == "refund",
                Payment.status == "completed",
                func.date(Payment.created_at) >= from_date,
                func.date(Payment.created_at) <= to_date,
            )
        )
        refund = refund_result.scalar() or 0

        expense_query = select(func.sum(Expense.amount)).where(
            Expense.status != "cancelled",
            Expense.expense_date >= from_date,
            Expense.expense_date <= to_date,
        )
        if branch_id:
            expense_query = expense_query.where(Expense.branch_id == branch_id)
        expense_result = await self.uow.session.execute(expense_query)
        expenses = expense_result.scalar() or 0

        return {
            "period_start": from_date,
            "period_end": to_date,
            "income_kopecks": income,
            "refund_kopecks": refund,
            "expense_kopecks": expenses,
            "net_kopecks": income - refund - expenses,
        }

    # ---------- Auto balance deduction per lesson ----------

    async def charge_for_lesson(
        self,
        schedule: Schedule,
        student_id: int,
        attendance_status: str,
        occurrence_date: Optional[date] = None,
    ) -> Optional[Transaction]:
        """Списываем с баланса ученика стоимость занятия (если статус present/late)."""
        if attendance_status in ("absent", "excused"):
            return None

        student = await self.uow.session.get(User, student_id)
        if not student:
            return None

        group = await self.uow.session.get(Group, schedule.group_id)
        if not group:
            return None

        membership_result = await self.uow.session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group.id,
                GroupMembership.student_id == student_id,
                GroupMembership.status == "active",
            )
        )
        membership = membership_result.scalar_one_or_none()

        # Определяем фактическое начало/конец вхождения с учётом исключений
        from app.models.schedule import ScheduleException

        start_time = schedule.start_time
        end_time = schedule.end_time
        if occurrence_date and occurrence_date != schedule.start_time.date():
            exception_result = await self.uow.session.execute(
                select(ScheduleException).where(
                    ScheduleException.schedule_id == schedule.id,
                    ScheduleException.exception_date == occurrence_date,
                )
            )
            exception = exception_result.scalar_one_or_none()
            if exception:
                if exception.start_time:
                    start_time = exception.start_time
                else:
                    start_time = start_time.replace(year=occurrence_date.year, month=occurrence_date.month, day=occurrence_date.day)
                if exception.end_time:
                    end_time = exception.end_time
                else:
                    end_time = end_time.replace(year=occurrence_date.year, month=occurrence_date.month, day=occurrence_date.day)
            else:
                start_time = start_time.replace(year=occurrence_date.year, month=occurrence_date.month, day=occurrence_date.day)
                end_time = end_time.replace(year=occurrence_date.year, month=occurrence_date.month, day=occurrence_date.day)

        rate = (membership.individual_hourly_rate if membership else None) or group.hourly_rate or 0
        academic_minutes = group.academic_hour_minutes
        duration_minutes = (end_time - start_time).total_seconds() / 60
        hours = duration_minutes / academic_minutes
        discount = membership.discount_percent if membership else 0
        amount = -int(hours * rate * (100 - discount) / 100)

        if amount == 0:
            return None

        new_balance = (student.balance or 0) + amount
        student.balance = new_balance

        transaction = Transaction(
            user_id=student.id,
            amount=amount,
            type="lesson_charge",
            balance_after=new_balance,
            description=f"Списание за занятие {schedule.title} ({start_time:%d.%m.%Y})",
        )
        self.uow.session.add(transaction)
        await self.uow.session.flush()
        return transaction

    # ---------- Subscriptions ----------

    async def create_subscription(self, data: dict) -> Subscription:
        subscription = Subscription(**data)
        self.uow.session.add(subscription)
        await self.uow.session.flush()
        await self.uow.session.refresh(subscription)
        return subscription

    async def list_subscriptions(
        self,
        *,
        student_id: Optional[int] = None,
        group_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[Subscription]:
        query = select(Subscription)
        filters = []
        if student_id:
            filters.append(Subscription.student_id == student_id)
        if group_id:
            filters.append(Subscription.group_id == group_id)
        if status:
            filters.append(Subscription.status == status)
        if filters:
            query = query.where(and_(*filters))
        result = await self.uow.session.execute(query.order_by(Subscription.created_at.desc()))
        return list(result.scalars().all())

    async def get_subscription(self, subscription_id: int) -> Optional[Subscription]:
        result = await self.uow.session.execute(select(Subscription).where(Subscription.id == subscription_id))
        return result.scalar_one_or_none()

    async def update_subscription(self, subscription: Subscription, data: dict) -> Subscription:
        for field, value in data.items():
            setattr(subscription, field, value)
        await self.uow.session.flush()
        await self.uow.session.refresh(subscription)
        return subscription

    async def delete_subscription(self, subscription: Subscription) -> None:
        await self.uow.session.delete(subscription)
        await self.uow.session.flush()

    async def renew_subscription(self, subscription: Subscription) -> Subscription:
        if subscription.type == "monthly":
            current_end = subscription.end_date or date.today()
            subscription.end_date = current_end + timedelta(days=30)
        elif subscription.type == "lessons":
            subscription.lessons_total += subscription.lessons_total or 8
        subscription.status = "active"
        subscription.frozen_at = None
        subscription.frozen_until = None
        await self.uow.session.flush()
        await self.uow.session.refresh(subscription)
        return subscription

    async def freeze_subscription(self, subscription: Subscription, frozen_until: Optional[date] = None) -> Subscription:
        subscription.status = "frozen"
        subscription.frozen_at = utc_now()
        subscription.frozen_until = frozen_until
        await self.uow.session.flush()
        await self.uow.session.refresh(subscription)
        return subscription

    async def cancel_subscription(self, subscription: Subscription) -> Subscription:
        subscription.status = "cancelled"
        await self.uow.session.flush()
        await self.uow.session.refresh(subscription)
        return subscription

    async def deduct_lesson(self, subscription_id: int) -> Optional[Subscription]:
        subscription = await self.get_subscription(subscription_id)
        if not subscription or subscription.status != "active" or subscription.type != "lessons":
            return subscription
        subscription.lessons_used += 1
        if subscription.lessons_used >= subscription.lessons_total:
            subscription.status = "expired"
        await self.uow.session.flush()
        await self.uow.session.refresh(subscription)
        return subscription

    # ---------- Payroll run ----------

    async def run_teacher_payroll(
        self,
        teacher_id: int,
        from_date: date,
        to_date: date,
        created_by_id: Optional[int] = None,
    ) -> dict:
        payroll = await self.calculate_teacher_payroll(teacher_id, from_date, to_date)
        expense = Expense(
            category="salary",
            amount=payroll["total_amount_kopecks"],
            expense_date=date.today(),
            description=f"Зарплата {payroll['teacher_name']} за {from_date:%d.%m.%Y} – {to_date:%d.%m.%Y}",
            created_by_id=created_by_id,
        )
        self.uow.session.add(expense)
        await self.uow.session.flush()
        await self.uow.session.refresh(expense)
        payroll["expense_id"] = expense.id
        return payroll
