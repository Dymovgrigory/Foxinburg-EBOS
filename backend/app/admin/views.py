from sqladmin import ModelView

from app.models import (
    Achievement,
    AuditLog,
    Branch,
    ChatMessage,
    ChatParticipant,
    ChatRoom,
    Course,
    Deal,
    Enrollment,
    File,
    Group,
    Homework,
    HomeworkReview,
    Lead,
    Lesson,
    LessonContent,
    LessonProgress,
    Module,
    Notification,
    Organization,
    Payment,
    Schedule,
    SystemEvent,
    Test,
    TestAttempt,
    TestQuestion,
    Transaction,
    User,
    UserAchievement,
    Attendance,
)


class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.email, User.name, User.role, User.is_active, User.created_at]
    column_searchable_list = [User.email, User.name]
    column_sortable_list = [User.id, User.email, User.name, User.role, User.created_at]
    column_default_sort = ("id", True)
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True
    name = "Пользователь"
    name_plural = "Пользователи"
    icon = "fa-solid fa-user"


class OrganizationAdmin(ModelView, model=Organization):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Организация"
    icon = "fa-solid fa-building"


class BranchAdmin(ModelView, model=Branch):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Филиал"
    icon = "fa-solid fa-code-branch"


class CourseAdmin(ModelView, model=Course):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Курс"
    icon = "fa-solid fa-book"


class ModuleAdmin(ModelView, model=Module):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Модуль"
    icon = "fa-solid fa-folder"


class LessonAdmin(ModelView, model=Lesson):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Урок"
    icon = "fa-solid fa-chalkboard"


class LessonContentAdmin(ModelView, model=LessonContent):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Контент урока"
    icon = "fa-solid fa-file-lines"


class TestAdmin(ModelView, model=Test):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Тест"
    icon = "fa-solid fa-clipboard-question"


class TestQuestionAdmin(ModelView, model=TestQuestion):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Вопрос теста"
    icon = "fa-solid fa-circle-question"


class TestAttemptAdmin(ModelView, model=TestAttempt):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Попытка теста"
    icon = "fa-solid fa-list-check"


class HomeworkAdmin(ModelView, model=Homework):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Домашнее задание"
    icon = "fa-solid fa-house-laptop"


class HomeworkReviewAdmin(ModelView, model=HomeworkReview):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Проверка ДЗ"
    icon = "fa-solid fa-check-double"


class GroupAdmin(ModelView, model=Group):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Группа"
    icon = "fa-solid fa-users"


class EnrollmentAdmin(ModelView, model=Enrollment):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Зачисление"
    icon = "fa-solid fa-user-plus"


class LessonProgressAdmin(ModelView, model=LessonProgress):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Прогресс урока"
    icon = "fa-solid fa-bars-progress"


class LeadAdmin(ModelView, model=Lead):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Лид"
    icon = "fa-solid fa-address-card"


class DealAdmin(ModelView, model=Deal):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Сделка"
    icon = "fa-solid fa-handshake"


class PaymentAdmin(ModelView, model=Payment):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Платёж"
    icon = "fa-solid fa-credit-card"


class TransactionAdmin(ModelView, model=Transaction):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Транзакция"
    icon = "fa-solid fa-money-bill-transfer"


class SystemEventAdmin(ModelView, model=SystemEvent):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Системное событие"
    icon = "fa-solid fa-tower-broadcast"


class AuditLogAdmin(ModelView, model=AuditLog):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Audit-лог"
    icon = "fa-solid fa-file-shield"


class NotificationAdmin(ModelView, model=Notification):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Уведомление"
    icon = "fa-solid fa-bell"


class AchievementAdmin(ModelView, model=Achievement):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Ачивка"
    icon = "fa-solid fa-trophy"


class UserAchievementAdmin(ModelView, model=UserAchievement):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Ачивка пользователя"
    icon = "fa-solid fa-medal"


class FileAdmin(ModelView, model=File):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Файл"
    icon = "fa-solid fa-file"


class ScheduleAdmin(ModelView, model=Schedule):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Занятие"
    icon = "fa-solid fa-calendar-day"


class AttendanceAdmin(ModelView, model=Attendance):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Посещаемость"
    icon = "fa-solid fa-clipboard-user"


class ChatRoomAdmin(ModelView, model=ChatRoom):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Чат"
    icon = "fa-solid fa-comments"


class ChatParticipantAdmin(ModelView, model=ChatParticipant):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Участник чата"
    icon = "fa-solid fa-user-group"


class ChatMessageAdmin(ModelView, model=ChatMessage):
    can_create = can_edit = can_delete = can_view_details = True
    name = name_plural = "Сообщение чата"
    icon = "fa-solid fa-comment"


admin_views = [
    UserAdmin,
    OrganizationAdmin,
    BranchAdmin,
    CourseAdmin,
    ModuleAdmin,
    LessonAdmin,
    LessonContentAdmin,
    TestAdmin,
    TestQuestionAdmin,
    TestAttemptAdmin,
    HomeworkAdmin,
    HomeworkReviewAdmin,
    GroupAdmin,
    EnrollmentAdmin,
    LessonProgressAdmin,
    LeadAdmin,
    DealAdmin,
    PaymentAdmin,
    TransactionAdmin,
    SystemEventAdmin,
    AuditLogAdmin,
    NotificationAdmin,
    AchievementAdmin,
    UserAchievementAdmin,
    FileAdmin,
    ScheduleAdmin,
    AttendanceAdmin,
    ChatRoomAdmin,
    ChatParticipantAdmin,
    ChatMessageAdmin,
]
