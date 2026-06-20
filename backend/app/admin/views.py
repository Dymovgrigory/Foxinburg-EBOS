from sqladmin import ModelView
from wtforms import PasswordField, validators

from app.core.security import get_password_hash
from app.core.encryption import encrypt_text
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


class BaseAdmin(ModelView):
    page_size = 25
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class UserAdmin(BaseAdmin, model=User):
    column_list = ["id", "email", "plain_password", "name", "role", "plan", "is_active", "is_verified", "last_login_at", "created_at"]
    column_labels = {
        "id": "ID",
        "email": "Email / Логин",
        "plain_password": "Пароль",
        "name": "Имя",
        "role": "Роль",
        "plan": "Тариф",
        "is_active": "Активен",
        "is_verified": "Верифицирован",
        "last_login_at": "Последний вход",
        "created_at": "Создан",
    }
    column_searchable_list = ["email", "name"]
    column_sortable_list = ["id", "email", "name", "role", "is_active", "last_login_at", "created_at"]
    column_default_sort = ("id", True)
    form_columns = ["email", "name", "role", "plan", "password", "is_active", "is_verified"]
    form_extra_fields = {
        "password": PasswordField(
            "Пароль",
            validators=[validators.Optional()],
            description="Заполните, чтобы задать или сменить пароль. Хранится в виде хеша.",
        ),
    }
    name = "Пользователь"
    name_plural = "Пользователи"
    icon = "fa-solid fa-user"

    async def on_model_change(self, data, model, is_created):
        password = data.pop("password", None)
        if password:
            model.password_hash = get_password_hash(password)
            model.encrypted_password = encrypt_text(password)
        elif is_created and not getattr(model, "password_hash", None):
            raise ValueError("При создании пользователя необходимо задать пароль")
        await super().on_model_change(data, model, is_created)


class OrganizationAdmin(BaseAdmin, model=Organization):
    column_list = ["id", "name", "timezone", "currency", "is_active", "created_at"]
    column_labels = {
        "id": "ID",
        "name": "Название",
        "timezone": "Часовой пояс",
        "currency": "Валюта",
        "is_active": "Активна",
        "created_at": "Создана",
    }
    column_searchable_list = ["name"]
    column_sortable_list = ["id", "name", "is_active", "created_at"]
    name = "Организация"
    name_plural = "Организации"
    icon = "fa-solid fa-building"


class BranchAdmin(BaseAdmin, model=Branch):
    column_list = ["id", "name", "address", "phone", "email", "is_active", "created_at"]
    column_labels = {
        "id": "ID",
        "name": "Название",
        "address": "Адрес",
        "phone": "Телефон",
        "email": "Email",
        "is_active": "Активен",
        "created_at": "Создан",
    }
    column_searchable_list = ["name", "address"]
    column_sortable_list = ["id", "name", "is_active", "created_at"]
    name = "Филиал"
    name_plural = "Филиалы"
    icon = "fa-solid fa-code-branch"


class CourseAdmin(BaseAdmin, model=Course):
    column_list = ["id", "title", "type", "status", "passing_score", "created_at"]
    column_labels = {
        "id": "ID",
        "title": "Название",
        "type": "Тип",
        "status": "Статус",
        "passing_score": "Проходной балл",
        "created_at": "Создан",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "status", "created_at"]
    name = "Курс"
    name_plural = "Курсы"
    icon = "fa-solid fa-book"


class ModuleAdmin(BaseAdmin, model=Module):
    column_list = ["id", "title", "course_id", "order_index", "is_active", "created_at"]
    column_labels = {
        "id": "ID",
        "title": "Название",
        "course_id": "Курс ID",
        "order_index": "Порядок",
        "is_active": "Активен",
        "created_at": "Создан",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "order_index", "is_active"]
    name = "Модуль"
    name_plural = "Модули"
    icon = "fa-solid fa-folder"


class LessonAdmin(BaseAdmin, model=Lesson):
    column_list = ["id", "title", "module_id", "lesson_type", "duration_minutes", "is_active", "created_at"]
    column_labels = {
        "id": "ID",
        "title": "Название",
        "module_id": "Модуль ID",
        "lesson_type": "Тип урока",
        "duration_minutes": "Длительность (мин)",
        "is_active": "Активен",
        "created_at": "Создан",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "lesson_type", "is_active"]
    name = "Урок"
    name_plural = "Уроки"
    icon = "fa-solid fa-chalkboard"


class LessonContentAdmin(BaseAdmin, model=LessonContent):
    column_list = ["id", "lesson_id", "title", "content_type", "order_index"]
    column_labels = {
        "id": "ID",
        "lesson_id": "Урок ID",
        "title": "Название",
        "content_type": "Тип контента",
        "order_index": "Порядок",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "content_type", "order_index"]
    name = "Контент урока"
    name_plural = "Контент уроков"
    icon = "fa-solid fa-file-lines"


class TestAdmin(BaseAdmin, model=Test):
    column_list = ["id", "title", "lesson_id", "passing_score", "time_limit_minutes", "is_active", "created_at"]
    column_labels = {
        "id": "ID",
        "title": "Название",
        "lesson_id": "Урок ID",
        "passing_score": "Проходной балл",
        "time_limit_minutes": "Лимит времени (мин)",
        "is_active": "Активен",
        "created_at": "Создан",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "is_active", "created_at"]
    name = "Тест"
    name_plural = "Тесты"
    icon = "fa-solid fa-clipboard-question"


class TestQuestionAdmin(BaseAdmin, model=TestQuestion):
    column_list = ["id", "test_id", "question_text", "question_type", "points", "order_index"]
    column_labels = {
        "id": "ID",
        "test_id": "Тест ID",
        "question_text": "Вопрос",
        "question_type": "Тип вопроса",
        "points": "Баллы",
        "order_index": "Порядок",
    }
    column_searchable_list = ["question_text"]
    column_sortable_list = ["id", "test_id", "question_type", "points"]
    name = "Вопрос теста"
    name_plural = "Вопросы тестов"
    icon = "fa-solid fa-circle-question"


class TestAttemptAdmin(BaseAdmin, model=TestAttempt):
    column_list = ["id", "test_id", "student_id", "score", "max_score", "is_passed", "started_at"]
    column_labels = {
        "id": "ID",
        "test_id": "Тест ID",
        "student_id": "Студент ID",
        "score": "Балл",
        "max_score": "Макс. балл",
        "is_passed": "Пройден",
        "started_at": "Начат",
    }
    column_sortable_list = ["id", "test_id", "student_id", "score", "is_passed"]
    name = "Попытка теста"
    name_plural = "Попытки тестов"
    icon = "fa-solid fa-list-check"


class HomeworkAdmin(BaseAdmin, model=Homework):
    column_list = ["id", "lesson_id", "student_id", "status", "submitted_at", "created_at"]
    column_labels = {
        "id": "ID",
        "lesson_id": "Урок ID",
        "student_id": "Студент ID",
        "status": "Статус",
        "submitted_at": "Отправлено",
        "created_at": "Создано",
    }
    column_sortable_list = ["id", "lesson_id", "student_id", "status", "submitted_at"]
    name = "Домашнее задание"
    name_plural = "Домашние задания"
    icon = "fa-solid fa-house-laptop"


class HomeworkReviewAdmin(BaseAdmin, model=HomeworkReview):
    column_list = ["id", "homework_id", "reviewed_by_id", "status", "score", "created_at"]
    column_labels = {
        "id": "ID",
        "homework_id": "ДЗ ID",
        "reviewed_by_id": "Проверил ID",
        "status": "Статус",
        "score": "Балл",
        "created_at": "Создано",
    }
    column_sortable_list = ["id", "homework_id", "reviewed_by_id", "status", "score"]
    name = "Проверка ДЗ"
    name_plural = "Проверки ДЗ"
    icon = "fa-solid fa-check-double"


class GroupAdmin(BaseAdmin, model=Group):
    column_list = ["id", "name", "teacher_id", "course_id", "max_students", "created_at"]
    column_labels = {
        "id": "ID",
        "name": "Название",
        "teacher_id": "Преподаватель ID",
        "course_id": "Курс ID",
        "max_students": "Макс. студентов",
        "created_at": "Создана",
    }
    column_searchable_list = ["name"]
    column_sortable_list = ["id", "name", "teacher_id", "course_id"]
    name = "Группа"
    name_plural = "Группы"
    icon = "fa-solid fa-users"


class EnrollmentAdmin(BaseAdmin, model=Enrollment):
    column_list = ["id", "student_id", "course_id", "group_id", "status", "progress_percent", "enrolled_at"]
    column_labels = {
        "id": "ID",
        "student_id": "Студент ID",
        "course_id": "Курс ID",
        "group_id": "Группа ID",
        "status": "Статус",
        "progress_percent": "Прогресс %",
        "enrolled_at": "Зачислен",
    }
    column_sortable_list = ["id", "student_id", "course_id", "status", "progress_percent"]
    name = "Зачисление"
    name_plural = "Зачисления"
    icon = "fa-solid fa-user-plus"


class LessonProgressAdmin(BaseAdmin, model=LessonProgress):
    column_list = ["id", "student_id", "lesson_id", "enrollment_id", "status", "completed_at"]
    column_labels = {
        "id": "ID",
        "student_id": "Студент ID",
        "lesson_id": "Урок ID",
        "enrollment_id": "Зачисление ID",
        "status": "Статус",
        "completed_at": "Завершён",
    }
    column_sortable_list = ["id", "student_id", "lesson_id", "status", "completed_at"]
    name = "Прогресс урока"
    name_plural = "Прогресс уроков"
    icon = "fa-solid fa-bars-progress"


class LeadAdmin(BaseAdmin, model=Lead):
    column_list = ["id", "name", "email", "phone", "source", "status", "created_at"]
    column_labels = {
        "id": "ID",
        "name": "Имя",
        "email": "Email",
        "phone": "Телефон",
        "source": "Источник",
        "status": "Статус",
        "created_at": "Создан",
    }
    column_searchable_list = ["name", "email", "phone"]
    column_sortable_list = ["id", "name", "email", "status", "created_at"]
    name = "Лид"
    name_plural = "Лиды"
    icon = "fa-solid fa-address-card"


class DealAdmin(BaseAdmin, model=Deal):
    column_list = ["id", "lead_id", "title", "amount", "status", "created_at"]
    column_labels = {
        "id": "ID",
        "lead_id": "Лид ID",
        "title": "Название",
        "amount": "Сумма",
        "status": "Статус",
        "created_at": "Создана",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "lead_id", "amount", "status", "created_at"]
    name = "Сделка"
    name_plural = "Сделки"
    icon = "fa-solid fa-handshake"


class PaymentAdmin(BaseAdmin, model=Payment):
    column_list = ["id", "student_id", "amount", "type", "method", "status", "created_at"]
    column_labels = {
        "id": "ID",
        "student_id": "Студент ID",
        "amount": "Сумма",
        "type": "Тип",
        "method": "Метод",
        "status": "Статус",
        "created_at": "Создан",
    }
    column_sortable_list = ["id", "student_id", "amount", "type", "status", "created_at"]
    name = "Платёж"
    name_plural = "Платежи"
    icon = "fa-solid fa-credit-card"


class TransactionAdmin(BaseAdmin, model=Transaction):
    column_list = ["id", "user_id", "amount", "type", "balance_after", "created_at"]
    column_labels = {
        "id": "ID",
        "user_id": "Пользователь ID",
        "amount": "Сумма",
        "type": "Тип",
        "balance_after": "Баланс после",
        "created_at": "Создана",
    }
    column_sortable_list = ["id", "user_id", "amount", "type", "created_at"]
    name = "Транзакция"
    name_plural = "Транзакции"
    icon = "fa-solid fa-money-bill-transfer"


class SystemEventAdmin(BaseAdmin, model=SystemEvent):
    column_list = ["id", "type", "user_id", "is_processed", "created_at"]
    column_labels = {
        "id": "ID",
        "type": "Тип",
        "user_id": "Пользователь ID",
        "is_processed": "Обработано",
        "created_at": "Создано",
    }
    column_sortable_list = ["id", "type", "user_id", "is_processed", "created_at"]
    name = "Системное событие"
    name_plural = "Системные события"
    icon = "fa-solid fa-tower-broadcast"


class AuditLogAdmin(BaseAdmin, model=AuditLog):
    column_list = ["id", "user_id", "action", "entity_type", "entity_id", "created_at"]
    column_labels = {
        "id": "ID",
        "user_id": "Пользователь ID",
        "action": "Действие",
        "entity_type": "Тип сущности",
        "entity_id": "Сущность ID",
        "created_at": "Создан",
    }
    column_sortable_list = ["id", "user_id", "action", "entity_type", "created_at"]
    name = "Audit-лог"
    name_plural = "Audit-логи"
    icon = "fa-solid fa-file-shield"


class NotificationAdmin(BaseAdmin, model=Notification):
    column_list = ["id", "user_id", "title", "type", "is_read", "is_deleted", "created_at"]
    column_labels = {
        "id": "ID",
        "user_id": "Пользователь ID",
        "title": "Заголовок",
        "type": "Тип",
        "is_read": "Прочитано",
        "is_deleted": "Удалено",
        "created_at": "Создано",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "user_id", "title", "type", "is_read", "created_at"]
    name = "Уведомление"
    name_plural = "Уведомления"
    icon = "fa-solid fa-bell"


class AchievementAdmin(BaseAdmin, model=Achievement):
    column_list = ["id", "title", "condition_type", "condition_value", "xp_reward", "coins_reward", "created_at"]
    column_labels = {
        "id": "ID",
        "title": "Название",
        "condition_type": "Тип условия",
        "condition_value": "Значение условия",
        "xp_reward": "Награда XP",
        "coins_reward": "Награда монет",
        "created_at": "Создана",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "condition_type", "created_at"]
    name = "Ачивка"
    name_plural = "Ачивки"
    icon = "fa-solid fa-trophy"


class UserAchievementAdmin(BaseAdmin, model=UserAchievement):
    column_list = ["id", "user_id", "achievement_id", "earned_at"]
    column_labels = {
        "id": "ID",
        "user_id": "Пользователь ID",
        "achievement_id": "Ачивка ID",
        "earned_at": "Получена",
    }
    column_sortable_list = ["id", "user_id", "achievement_id", "earned_at"]
    name = "Ачивка пользователя"
    name_plural = "Ачивки пользователей"
    icon = "fa-solid fa-medal"


class FileAdmin(BaseAdmin, model=File):
    column_list = ["id", "original_name", "file_type", "mime_type", "size_bytes", "entity_type", "created_at"]
    column_labels = {
        "id": "ID",
        "original_name": "Имя файла",
        "file_type": "Тип файла",
        "mime_type": "MIME",
        "size_bytes": "Размер (байт)",
        "entity_type": "Тип сущности",
        "created_at": "Создан",
    }
    column_searchable_list = ["original_name"]
    column_sortable_list = ["id", "original_name", "file_type", "created_at"]
    name = "Файл"
    name_plural = "Файлы"
    icon = "fa-solid fa-file"


class ScheduleAdmin(BaseAdmin, model=Schedule):
    column_list = ["id", "title", "group_id", "teacher_id", "start_time", "end_time", "status"]
    column_labels = {
        "id": "ID",
        "title": "Название",
        "group_id": "Группа ID",
        "teacher_id": "Преподаватель ID",
        "start_time": "Начало",
        "end_time": "Окончание",
        "status": "Статус",
    }
    column_searchable_list = ["title"]
    column_sortable_list = ["id", "title", "group_id", "start_time", "status"]
    name = "Занятие"
    name_plural = "Занятия"
    icon = "fa-solid fa-calendar-day"


class AttendanceAdmin(BaseAdmin, model=Attendance):
    column_list = ["id", "schedule_id", "student_id", "status", "marked_at"]
    column_labels = {
        "id": "ID",
        "schedule_id": "Занятие ID",
        "student_id": "Студент ID",
        "status": "Статус",
        "marked_at": "Отмечено",
    }
    column_sortable_list = ["id", "schedule_id", "student_id", "status", "marked_at"]
    name = "Посещаемость"
    name_plural = "Посещаемость"
    icon = "fa-solid fa-clipboard-user"


class ChatRoomAdmin(BaseAdmin, model=ChatRoom):
    column_list = ["id", "name", "type", "group_id", "created_at"]
    column_labels = {
        "id": "ID",
        "name": "Название",
        "type": "Тип",
        "group_id": "Группа ID",
        "created_at": "Создан",
    }
    column_searchable_list = ["name"]
    column_sortable_list = ["id", "name", "type", "created_at"]
    name = "Чат"
    name_plural = "Чаты"
    icon = "fa-solid fa-comments"


class ChatParticipantAdmin(BaseAdmin, model=ChatParticipant):
    column_list = ["id", "room_id", "user_id", "role", "joined_at"]
    column_labels = {
        "id": "ID",
        "room_id": "Чат ID",
        "user_id": "Пользователь ID",
        "role": "Роль",
        "joined_at": "Присоединился",
    }
    column_sortable_list = ["id", "room_id", "user_id", "role", "joined_at"]
    name = "Участник чата"
    name_plural = "Участники чатов"
    icon = "fa-solid fa-user-group"


class ChatMessageAdmin(BaseAdmin, model=ChatMessage):
    column_list = ["id", "room_id", "sender_id", "content", "is_deleted", "created_at"]
    column_labels = {
        "id": "ID",
        "room_id": "Чат ID",
        "sender_id": "Отправитель ID",
        "content": "Сообщение",
        "is_deleted": "Удалено",
        "created_at": "Отправлено",
    }
    column_searchable_list = ["content"]
    column_sortable_list = ["id", "room_id", "sender_id", "created_at"]
    name = "Сообщение чата"
    name_plural = "Сообщения чатов"
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
