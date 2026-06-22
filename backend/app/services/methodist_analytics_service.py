"""Сервис аналитики для дашборда методиста."""

import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.course import Course, Module, Lesson
from app.models.schedule import Attendance, Schedule
from app.models.employee_group import EmployeeGroup, employee_group_members
from app.models.enrollment import Enrollment, LessonProgress
from app.models.group import Group
from app.models.homework import Homework, HomeworkReview
from app.models.test import Test, TestAttempt
from app.models.user import User
from app.services.teacher_academy_service import TeacherAcademyService
from app.services.unit_of_work import UnitOfWork


# Пороги для определения риска отчисления
RISK_HIGH_PROGRESS = 30
RISK_MEDIUM_PROGRESS = 60
RISK_HIGH_ATTENDANCE = 50
RISK_MEDIUM_ATTENDANCE = 70
HOMEWORK_OVERDUE_DAYS = 7


class MethodistAnalyticsService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_analytics(self, branch_id: Optional[int] = None) -> Dict[str, Any]:
        """Возвращает полный набор метрик для дашборда методиста."""
        overview = await self._get_overview(branch_id)
        courses = await self._get_courses_stats(branch_id)
        students = await self._get_students_stats(branch_id)
        homeworks_and_tests = await self._get_homeworks_and_tests_stats(branch_id)
        teachers = await self._get_teachers_stats(branch_id)
        upcoming_schedule = await self._get_upcoming_schedule(branch_id)

        return {
            "overview": overview,
            "courses": courses,
            "students": students,
            "homeworks_and_tests": homeworks_and_tests,
            "teachers": teachers,
            "upcoming_schedule": upcoming_schedule,
        }

    # ------------------------------------------------------------------
    # Overview
    # ------------------------------------------------------------------
    async def _get_overview(self, branch_id: Optional[int]) -> Dict[str, Any]:
        courses_result = await self.uow.session.execute(
            select(func.count(Course.id), func.count(Course.id).filter(Course.status == "published"))
        )
        courses_count, published_courses_count = courses_result.one()

        groups_query = select(func.count(Group.id))
        if branch_id:
            groups_query = groups_query.where(Group.branch_id == branch_id)
        groups_count = (await self.uow.session.execute(groups_query)).scalar() or 0

        employee_groups_count = (
            await self.uow.session.execute(select(func.count(EmployeeGroup.id)))
        ).scalar() or 0

        students_query = select(func.count(User.id)).where(
            User.role == "student", User.is_active == True
        )
        if branch_id:
            students_query = students_query.where(User.branch_id == branch_id)
        students_count = (await self.uow.session.execute(students_query)).scalar() or 0

        teachers_query = select(func.count(User.id)).where(
            User.role == "teacher", User.is_active == True
        )
        if branch_id:
            teachers_query = teachers_query.where(User.branch_id == branch_id)
        teachers_count = (await self.uow.session.execute(teachers_query)).scalar() or 0

        active_enrollments_count = (
            await self.uow.session.execute(
                select(func.count(Enrollment.id)).where(Enrollment.status == "active")
            )
        ).scalar() or 0

        pending_homeworks_count = (
            await self.uow.session.execute(
                select(func.count(Homework.id)).where(Homework.status == "submitted")
            )
        ).scalar() or 0

        overdue_threshold = datetime.datetime.utcnow() - datetime.timedelta(days=HOMEWORK_OVERDUE_DAYS)
        overdue_homeworks_count = (
            await self.uow.session.execute(
                select(func.count(Homework.id)).where(
                    Homework.status == "submitted",
                    Homework.submitted_at < overdue_threshold,
                )
            )
        ).scalar() or 0

        avg_progress = (
            await self.uow.session.execute(
                select(func.avg(Enrollment.progress_percent)).where(
                    Enrollment.status.in_(["active", "completed"])
                )
            )
        ).scalar() or 0

        avg_attendance = await self._get_average_attendance(branch_id)

        return {
            "courses_count": courses_count,
            "published_courses_count": published_courses_count,
            "groups_count": groups_count,
            "employee_groups_count": employee_groups_count,
            "students_count": students_count,
            "teachers_count": teachers_count,
            "active_enrollments_count": active_enrollments_count,
            "pending_homeworks_count": pending_homeworks_count,
            "overdue_homeworks_count": overdue_homeworks_count,
            "average_progress_percent": round(avg_progress or 0, 1),
            "average_attendance_percent": round(avg_attendance, 1),
        }

    async def _get_average_attendance(self, branch_id: Optional[int]) -> float:
        schedule_query = select(Schedule.id)
        if branch_id:
            schedule_query = schedule_query.where(Schedule.branch_id == branch_id)
        schedule_ids_result = await self.uow.session.execute(schedule_query)
        schedule_ids = [row[0] for row in schedule_ids_result.all()]
        if not schedule_ids:
            return 0.0

        total = (
            await self.uow.session.execute(
                select(func.count(Attendance.id)).where(Attendance.schedule_id.in_(schedule_ids))
            )
        ).scalar() or 0
        if total == 0:
            return 0.0

        present = (
            await self.uow.session.execute(
                select(func.count(Attendance.id)).where(
                    Attendance.schedule_id.in_(schedule_ids),
                    Attendance.status.in_(["present", "late", "excused"]),
                )
            )
        ).scalar() or 0
        return round((present / total) * 100, 1)

    # ------------------------------------------------------------------
    # Courses
    # ------------------------------------------------------------------
    async def _get_courses_stats(self, branch_id: Optional[int]) -> List[Dict[str, Any]]:
        result = await self.uow.session.execute(
            select(Course).options(
                selectinload(Course.modules).selectinload(Module.lessons)
            ).order_by(Course.created_at.desc())
        )
        courses = result.scalars().all()

        if not courses:
            return []

        course_ids = [c.id for c in courses]
        enrollments_result = await self.uow.session.execute(
            select(Enrollment).where(Enrollment.course_id.in_(course_ids))
        )
        enrollments = list(enrollments_result.scalars().all())

        items = []
        for course in courses:
            lessons_count = sum(len(module.lessons) for module in course.modules)
            course_enrollments = [e for e in enrollments if e.course_id == course.id]
            active = [e for e in course_enrollments if e.status == "active"]
            completed = [e for e in course_enrollments if e.status == "completed"]
            total_for_completion = len(active) + len(completed)
            avg_progress = (
                round(sum(e.progress_percent for e in course_enrollments) / len(course_enrollments), 1)
                if course_enrollments
                else 0
            )
            completion_rate = round((len(completed) / total_for_completion) * 100, 1) if total_for_completion else 0

            items.append(
                {
                    "id": course.id,
                    "title": course.title,
                    "type": course.type,
                    "status": course.status,
                    "modules_count": len(course.modules),
                    "lessons_count": lessons_count,
                    "students_count": len(course_enrollments),
                    "active_enrollments_count": len(active),
                    "completed_enrollments_count": len(completed),
                    "average_progress_percent": avg_progress,
                    "completion_rate_percent": completion_rate,
                }
            )
        return items

    # ------------------------------------------------------------------
    # Students
    # ------------------------------------------------------------------
    async def _get_students_stats(self, branch_id: Optional[int]) -> List[Dict[str, Any]]:
        students_query = select(User).where(User.role == "student", User.is_active == True)
        if branch_id:
            students_query = students_query.where(User.branch_id == branch_id)
        students_query = students_query.order_by(User.name)
        students_result = await self.uow.session.execute(students_query)
        students = list(students_result.scalars().all())
        if not students:
            return []

        student_ids = [s.id for s in students]

        enrollments_result = await self.uow.session.execute(
            select(Enrollment).where(Enrollment.student_id.in_(student_ids))
        )
        enrollments = list(enrollments_result.scalars().all())

        homeworks_result = await self.uow.session.execute(
            select(Homework).where(Homework.student_id.in_(student_ids))
        )
        homeworks = list(homeworks_result.scalars().all())

        attendances_result = await self.uow.session.execute(
            select(Attendance).where(Attendance.student_id.in_(student_ids))
        )
        attendances = list(attendances_result.scalars().all())

        groups_result = await self.uow.session.execute(select(Group))
        groups = {g.id: g for g in groups_result.scalars().all()}

        items = []
        for student in students:
            student_enrollments = [e for e in enrollments if e.student_id == student.id]
            active_enrollments = [e for e in student_enrollments if e.status == "active"]
            avg_progress = (
                round(sum(e.progress_percent for e in active_enrollments) / len(active_enrollments), 1)
                if active_enrollments
                else 0
            )

            student_homeworks = [h for h in homeworks if h.student_id == student.id]
            submitted = len([h for h in student_homeworks if h.status == "submitted"])
            reviewed = len([h for h in student_homeworks if h.status == "reviewed"])
            overdue = len(
                [
                    h
                    for h in student_homeworks
                    if h.status == "submitted"
                    and h.submitted_at
                    and h.submitted_at < datetime.datetime.utcnow() - datetime.timedelta(days=HOMEWORK_OVERDUE_DAYS)
                ]
            )

            student_attendances = [a for a in attendances if a.student_id == student.id]
            attendance_percent = self._calc_attendance_percent(student_attendances)

            risk = self._determine_risk(avg_progress, attendance_percent)

            group = groups.get(student.group_id) if student.group_id else None
            items.append(
                {
                    "id": student.id,
                    "name": student.name,
                    "email": student.email,
                    "group_id": student.group_id,
                    "group_name": group.name if group else None,
                    "active_enrollments_count": len(active_enrollments),
                    "average_progress_percent": avg_progress,
                    "homeworks_submitted": submitted,
                    "homeworks_reviewed": reviewed,
                    "homeworks_overdue": overdue,
                    "attendance_percent": attendance_percent,
                    "risk_status": risk,
                }
            )
        return items

    def _calc_attendance_percent(self, attendances: List[Attendance]) -> float:
        if not attendances:
            return 0.0
        present = len([a for a in attendances if a.status in ("present", "late", "excused")])
        return round((present / len(attendances)) * 100, 1)

    def _determine_risk(self, progress: float, attendance: float) -> str:
        if progress < RISK_HIGH_PROGRESS or attendance < RISK_HIGH_ATTENDANCE:
            return "high"
        if progress < RISK_MEDIUM_PROGRESS or attendance < RISK_MEDIUM_ATTENDANCE:
            return "medium"
        return "low"

    # ------------------------------------------------------------------
    # Homeworks & Tests
    # ------------------------------------------------------------------
    async def _get_homeworks_and_tests_stats(
        self, branch_id: Optional[int]
    ) -> Dict[str, Any]:
        status_counts = {
            "assigned": 0,
            "submitted": 0,
            "reviewed": 0,
            "revision": 0,
            "rejected": 0,
        }
        status_result = await self.uow.session.execute(
            select(Homework.status, func.count(Homework.id)).group_by(Homework.status)
        )
        for status, count in status_result.all():
            if status in status_counts:
                status_counts[status] = count

        overdue_threshold = datetime.datetime.utcnow() - datetime.timedelta(days=HOMEWORK_OVERDUE_DAYS)
        recent_pending_result = await self.uow.session.execute(
            select(Homework, User.name.label("student_name"), Lesson.title.label("lesson_title"))
            .join(User, Homework.student_id == User.id)
            .join(Lesson, Homework.lesson_id == Lesson.id)
            .where(Homework.status == "submitted")
            .order_by(Homework.submitted_at.asc())
            .limit(20)
        )
        recent_pending = []
        for row in recent_pending_result.all():
            homework, student_name, lesson_title = row
            recent_pending.append(
                {
                    "id": homework.id,
                    "title": homework.title or lesson_title,
                    "student_name": student_name,
                    "lesson_title": lesson_title,
                    "submitted_at": homework.submitted_at.isoformat() if homework.submitted_at else None,
                    "is_overdue": bool(
                        homework.submitted_at and homework.submitted_at < overdue_threshold
                    ),
                }
            )

        avg_score_result = await self.uow.session.execute(
            select(func.avg(TestAttempt.score)).where(TestAttempt.finished_at.is_not(None))
        )
        avg_score = round(avg_score_result.scalar() or 0, 1)

        attempts_result = await self.uow.session.execute(
            select(func.count(TestAttempt.id), func.count(TestAttempt.id).filter(TestAttempt.is_passed == True)).where(
                TestAttempt.finished_at.is_not(None)
            )
        )
        total_attempts, passed_attempts = attempts_result.one()
        pass_rate = round((passed_attempts / total_attempts) * 100, 1) if total_attempts else 0

        recent_attempts_result = await self.uow.session.execute(
            select(TestAttempt, User.name.label("student_name"), Test.title.label("test_title"))
            .join(User, TestAttempt.student_id == User.id)
            .join(Test, TestAttempt.test_id == Test.id)
            .where(TestAttempt.finished_at.is_not(None))
            .order_by(TestAttempt.finished_at.desc())
            .limit(10)
        )
        recent_attempts = []
        for row in recent_attempts_result.all():
            attempt, student_name, test_title = row
            recent_attempts.append(
                {
                    "id": attempt.id,
                    "student_name": student_name,
                    "test_title": test_title,
                    "score": attempt.score,
                    "max_score": attempt.max_score,
                    "is_passed": attempt.is_passed,
                    "finished_at": attempt.finished_at.isoformat() if attempt.finished_at else None,
                }
            )

        return {
            "homework_status_counts": status_counts,
            "pending_homeworks": recent_pending,
            "average_test_score": avg_score,
            "test_pass_rate_percent": pass_rate,
            "recent_test_attempts": recent_attempts,
        }

    # ------------------------------------------------------------------
    # Teachers
    # ------------------------------------------------------------------
    async def _get_teachers_stats(self, branch_id: Optional[int]) -> List[Dict[str, Any]]:
        teachers_query = select(User).where(User.role == "teacher", User.is_active == True)
        if branch_id:
            teachers_query = teachers_query.where(User.branch_id == branch_id)
        teachers_query = teachers_query.order_by(User.name)
        teachers_result = await self.uow.session.execute(teachers_query)
        teachers = list(teachers_result.scalars().all())
        if not teachers:
            return []

        teacher_ids = [t.id for t in teachers]

        groups_result = await self.uow.session.execute(
            select(Group).options(selectinload(Group.students))
        )
        all_groups = list(groups_result.scalars().all())

        schedules_result = await self.uow.session.execute(
            select(Schedule).where(Schedule.teacher_id.in_(teacher_ids))
        )
        schedules = list(schedules_result.scalars().all())

        academy_service = TeacherAcademyService(self.uow)
        academy_course = await academy_service.get_academy_course()
        academy_enrollments = []
        if academy_course:
            enrollments_result = await self.uow.session.execute(
                select(Enrollment).where(
                    Enrollment.course_id == academy_course.id,
                    Enrollment.student_id.in_(teacher_ids),
                )
            )
            academy_enrollments = list(enrollments_result.scalars().all())
        academy_enrollment_by_teacher = {e.student_id: e for e in academy_enrollments}

        items = []
        for teacher in teachers:
            teacher_groups = [g for g in all_groups if g.teacher_id == teacher.id]
            students_count = sum(len(g.students) for g in teacher_groups)
            teacher_schedules = [s for s in schedules if s.teacher_id == teacher.id]

            academy_enrollment = academy_enrollment_by_teacher.get(teacher.id)
            if academy_enrollment:
                academy_progress = academy_enrollment.progress_percent
                academy_status = (
                    "completed" if academy_enrollment.status == "completed" else "in_progress"
                )
            else:
                academy_progress = 0
                academy_status = "not_enrolled"

            items.append(
                {
                    "id": teacher.id,
                    "name": teacher.name,
                    "email": teacher.email,
                    "groups_count": len(teacher_groups),
                    "students_count": students_count,
                    "schedules_count": len(teacher_schedules),
                    "academy_progress_percent": academy_progress,
                    "academy_status": academy_status,
                }
            )
        return items

    # ------------------------------------------------------------------
    # Upcoming schedule
    # ------------------------------------------------------------------
    async def _get_upcoming_schedule(self, branch_id: Optional[int]) -> List[Dict[str, Any]]:
        now = datetime.datetime.utcnow()
        query = (
            select(Schedule, Course.title.label("course_title"), Group.name.label("group_name"), User.name.label("teacher_name"))
            .outerjoin(Course, Schedule.course_id == Course.id)
            .outerjoin(Group, Schedule.group_id == Group.id)
            .join(User, Schedule.teacher_id == User.id)
            .where(Schedule.start_time >= now)
            .order_by(Schedule.start_time.asc())
            .limit(10)
        )
        if branch_id:
            query = query.where(Schedule.branch_id == branch_id)

        result = await self.uow.session.execute(query)
        items = []
        for row in result.all():
            schedule, course_title, group_name, teacher_name = row
            items.append(
                {
                    "id": schedule.id,
                    "title": schedule.title,
                    "course_title": course_title,
                    "group_name": group_name,
                    "teacher_name": teacher_name,
                    "room": schedule.room,
                    "start_time": schedule.start_time.isoformat(),
                    "end_time": schedule.end_time.isoformat(),
                }
            )
        return items
