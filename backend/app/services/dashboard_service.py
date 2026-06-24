from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func, and_, or_

from app.models.user import User
from app.models.crm import Lead, Deal
from app.models.finance import Payment, Invoice, Expense
from app.models.task import Task
from app.models.schedule import Schedule
from app.models.homework import Homework
from app.models.enrollment import LessonProgress
from app.models.group import Group, GroupMembership
from app.models.notification import Notification
from app.services.unit_of_work import UnitOfWork
from app.services.schedule_service import ScheduleService
from app.services.methodist_analytics_service import MethodistAnalyticsService
from app.core.permissions import Permission, has_permission
from app.utils import utc_now


class DashboardService:
    """Сервис сводной информации для ролевых дашбордов."""

    def __init__(self, uow: UnitOfWork, user: User):
        self.uow = uow
        self.user = user

    async def get_summary(self) -> Dict[str, Any]:
        role = self.user.role

        if role in ("owner", "super_admin", "admin"):
            return await self._admin_summary()
        if role == "manager":
            return await self._manager_summary()
        if role == "methodist":
            return await self._methodist_summary()
        if role == "teacher":
            return await self._teacher_summary()
        if role == "student":
            return await self._student_summary()

        return {"role": role, "message": "Дашборд для этой роли в разработке"}

    async def _unread_count(self) -> int:
        result = await self.uow.session.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == self.user.id,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
        )
        return result.scalar_one()

    async def _task_count(self, status: Optional[str] = None) -> int:
        query = select(func.count(Task.id)).where(
            or_(
                Task.assignee_id == self.user.id,
                Task.creator_id == self.user.id,
            )
        )
        if status:
            query = query.where(Task.status == status)
        result = await self.uow.session.execute(query)
        return result.scalar_one()

    async def _admin_summary(self) -> Dict[str, Any]:
        users_result = await self.uow.session.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        users_by_role = {r: c for r, c in users_result.all()}

        income_result = await self.uow.session.execute(
            select(func.sum(Payment.amount)).where(
                Payment.type == "income", Payment.status == "completed"
            )
        )
        income = income_result.scalar() or 0

        refund_result = await self.uow.session.execute(
            select(func.sum(Payment.amount)).where(
                Payment.type == "refund", Payment.status == "completed"
            )
        )
        refund = refund_result.scalar() or 0

        expenses_result = await self.uow.session.execute(
            select(func.sum(Expense.amount)).where(Expense.status != "cancelled")
        )
        expenses = expenses_result.scalar() or 0

        debt_result = await self.uow.session.execute(
            select(func.sum(Invoice.amount)).where(
                Invoice.status.in_(["draft", "sent", "overdue"])
            )
        )
        debt = debt_result.scalar() or 0

        leads_result = await self.uow.session.execute(
            select(Lead.status, func.count(Lead.id)).group_by(Lead.status)
        )
        leads_by_status = {s: c for s, c in leads_result.all()}

        deals_result = await self.uow.session.execute(
            select(Deal.status, func.count(Deal.id)).group_by(Deal.status)
        )
        deals_by_status = {s: c for s, c in deals_result.all()}

        tasks_count = await self._task_count()

        return {
            "role": self.user.role,
            "users_by_role": users_by_role,
            "finance": {
                "income_kopecks": income,
                "refund_kopecks": refund,
                "expenses_kopecks": expenses,
                "net_kopecks": income - refund - expenses,
                "debt_kopecks": debt,
            },
            "leads_by_status": leads_by_status,
            "deals_by_status": deals_by_status,
            "tasks_count": tasks_count,
            "unread_count": await self._unread_count(),
        }

    async def _manager_summary(self) -> Dict[str, Any]:
        leads_result = await self.uow.session.execute(
            select(Lead.status, func.count(Lead.id)).group_by(Lead.status)
        )
        leads_by_status = {s: c for s, c in leads_result.all()}

        deals_result = await self.uow.session.execute(
            select(Deal.status, func.count(Deal.id)).group_by(Deal.status)
        )
        deals_by_status = {s: c for s, c in deals_result.all()}

        tasks_count = await self._task_count()

        return {
            "role": self.user.role,
            "leads_by_status": leads_by_status,
            "deals_by_status": deals_by_status,
            "tasks_count": tasks_count,
            "unread_count": await self._unread_count(),
        }

    async def _methodist_summary(self) -> Dict[str, Any]:
        service = MethodistAnalyticsService(self.uow)
        analytics = await service.get_analytics(branch_id=self.user.branch_id)
        overview = analytics.get("overview", {})

        return {
            "role": self.user.role,
            "courses_count": overview.get("courses_count", 0),
            "groups_count": overview.get("groups_count", 0),
            "students_count": overview.get("students_count", 0),
            "pending_homeworks_count": overview.get("pending_homeworks_count", 0),
            "unread_count": await self._unread_count(),
        }

    async def _teacher_summary(self) -> Dict[str, Any]:
        now = utc_now()
        tomorrow = now + timedelta(days=1)

        # Ближайшие занятия преподавателя (сегодня и завтра)
        schedule_service = ScheduleService(self.uow)
        schedules = await schedule_service.list_schedules(
            teacher_id=self.user.id,
            status="scheduled",
            start_from=now,
            limit=10,
        )

        occurrences: List[Dict[str, Any]] = []
        for schedule in schedules:
            schedule_occurrences = await schedule_service.generate_occurrences(
                schedule, now, tomorrow
            )
            occurrences.extend(schedule_occurrences)

        occurrences.sort(key=lambda o: o["start_time"])
        upcoming = occurrences[:5]

        # Количество активных учеников преподавателя
        students_result = await self.uow.session.execute(
            select(func.count(GroupMembership.student_id)).where(
                GroupMembership.status == "active",
                GroupMembership.group_id.in_(
                    select(Group.id).where(Group.teacher_id == self.user.id)
                ),
            )
        )
        students_count = students_result.scalar_one()

        # Домашние задания на проверку (submitted)
        homeworks_result = await self.uow.session.execute(
            select(func.count(Homework.id)).where(Homework.status == "submitted")
        )
        pending_homeworks = homeworks_result.scalar_one()

        return {
            "role": self.user.role,
            "upcoming_lessons": upcoming,
            "students_count": students_count,
            "pending_homeworks_count": pending_homeworks,
            "tasks_count": await self._task_count(),
            "unread_count": await self._unread_count(),
        }

    async def _student_summary(self) -> Dict[str, Any]:
        now = utc_now()
        tomorrow = now + timedelta(days=1)

        upcoming: List[Dict[str, Any]] = []
        if self.user.group_id:
            schedule_service = ScheduleService(self.uow)
            schedules = await schedule_service.list_schedules(
                group_id=self.user.group_id,
                status="scheduled",
                start_from=now,
                limit=10,
            )
            for schedule in schedules:
                schedule_occurrences = await schedule_service.generate_occurrences(
                    schedule, now, tomorrow
                )
                upcoming.extend(schedule_occurrences)
            upcoming.sort(key=lambda o: o["start_time"])
            upcoming = upcoming[:5]

        pending_homeworks_result = await self.uow.session.execute(
            select(func.count(Homework.id)).where(
                Homework.student_id == self.user.id,
                Homework.status.in_(["assigned", "in_progress"]),
            )
        )
        pending_homeworks = pending_homeworks_result.scalar_one()

        completed_lessons_result = await self.uow.session.execute(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.student_id == self.user.id,
                LessonProgress.status == "completed",
            )
        )
        completed_lessons = completed_lessons_result.scalar_one()

        return {
            "role": self.user.role,
            "upcoming_lessons": upcoming,
            "pending_homeworks_count": pending_homeworks,
            "completed_lessons_count": completed_lessons,
            "unread_count": await self._unread_count(),
        }
