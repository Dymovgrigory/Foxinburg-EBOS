from app.database import Base

from .user import User
from .organization import Organization, Branch
from .course import Course, Module, Lesson, LessonContent
from .test import Test, TestQuestion, TestAttempt
from .homework import Homework, HomeworkReview
from .group import Group
from .enrollment import Enrollment, LessonProgress
from .crm import Lead, Deal
from .finance import Payment, Transaction
from .event import SystemEvent, AuditLog
from .notification import Notification
from .achievement import Achievement, UserAchievement
from .file import File
from .schedule import Schedule, Attendance

__all__ = [
    "Base",
    "User",
    "Organization",
    "Branch",
    "Course",
    "Module",
    "Lesson",
    "LessonContent",
    "Test",
    "TestQuestion",
    "TestAttempt",
    "Homework",
    "HomeworkReview",
    "Group",
    "Enrollment",
    "LessonProgress",
    "Lead",
    "Deal",
    "Payment",
    "Transaction",
    "SystemEvent",
    "AuditLog",
    "Notification",
    "Achievement",
    "UserAchievement",
    "File",
    "Schedule",
    "Attendance",
]
