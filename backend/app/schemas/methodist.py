from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class MethodistOverview(BaseModel):
    courses_count: int
    published_courses_count: int
    groups_count: int
    employee_groups_count: int
    students_count: int
    teachers_count: int
    active_enrollments_count: int
    pending_homeworks_count: int
    overdue_homeworks_count: int
    average_progress_percent: float
    average_attendance_percent: float


class MethodistCourseStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    type: str
    status: str
    modules_count: int
    lessons_count: int
    students_count: int
    active_enrollments_count: int
    completed_enrollments_count: int
    average_progress_percent: float
    completion_rate_percent: float


class MethodistStudentStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    active_enrollments_count: int
    average_progress_percent: float
    homeworks_submitted: int
    homeworks_reviewed: int
    homeworks_overdue: int
    attendance_percent: float
    risk_status: str


class HomeworkStatusCounts(BaseModel):
    assigned: int
    submitted: int
    reviewed: int
    revision: int
    rejected: int


class PendingHomeworkItem(BaseModel):
    id: int
    title: str
    student_name: str
    lesson_title: str
    submitted_at: Optional[str] = None
    is_overdue: bool


class RecentTestAttemptItem(BaseModel):
    id: int
    student_name: str
    test_title: str
    score: int
    max_score: int
    is_passed: bool
    finished_at: Optional[str] = None


class MethodistHomeworksAndTests(BaseModel):
    homework_status_counts: HomeworkStatusCounts
    pending_homeworks: List[PendingHomeworkItem]
    average_test_score: float
    test_pass_rate_percent: float
    recent_test_attempts: List[RecentTestAttemptItem]


class MethodistTeacherStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    groups_count: int
    students_count: int
    schedules_count: int
    academy_progress_percent: int
    academy_status: str


class UpcomingScheduleItem(BaseModel):
    id: int
    title: str
    course_title: Optional[str] = None
    group_name: Optional[str] = None
    teacher_name: str
    room: Optional[str] = None
    start_time: str
    end_time: str


class MethodistAnalyticsResponse(BaseModel):
    overview: MethodistOverview
    courses: List[MethodistCourseStat]
    students: List[MethodistStudentStat]
    homeworks_and_tests: MethodistHomeworksAndTests
    teachers: List[MethodistTeacherStat]
    upcoming_schedule: List[UpcomingScheduleItem]
