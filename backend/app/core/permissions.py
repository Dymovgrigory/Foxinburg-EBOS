from enum import Enum
from typing import List, Optional


class Role(str, Enum):
    OWNER = "owner"
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    METHODIST = "methodist"
    TEACHER = "teacher"
    MANAGER = "manager"
    STUDENT = "student"
    PARENT = "parent"
    GUEST = "guest"


class Permission(str, Enum):
    # Users
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"

    # Organizations & branches
    ORGANIZATION_MANAGE = "organization:manage"
    BRANCH_MANAGE = "branch:manage"

    # Courses / modules / lessons
    COURSE_CREATE = "course:create"
    COURSE_READ = "course:read"
    COURSE_UPDATE = "course:update"
    COURSE_DELETE = "course:delete"
    COURSE_PUBLISH = "course:publish"

    MODULE_CREATE = "module:create"
    MODULE_READ = "module:read"
    MODULE_UPDATE = "module:update"
    MODULE_DELETE = "module:delete"

    LESSON_CREATE = "lesson:create"
    LESSON_READ = "lesson:read"
    LESSON_UPDATE = "lesson:update"
    LESSON_DELETE = "lesson:delete"
    LESSON_COMPLETE = "lesson:complete"

    # Groups & enrollments
    GROUP_READ = "group:read"
    GROUP_MANAGE = "group:manage"
    ENROLLMENT_MANAGE = "enrollment:manage"
    PROGRESS_READ = "progress:read"

    # Schedule & attendance
    ATTENDANCE_MANAGE = "attendance:manage"

    # Homework
    HOMEWORK_REVIEW = "homework:review"

    # Tasks
    TASK_READ = "task:read"
    TASK_CREATE = "task:create"
    TASK_UPDATE = "task:update"
    TASK_DELETE = "task:delete"

    # CRM / finance / analytics
    CRM_MANAGE = "crm:manage"
    FINANCE_MANAGE = "finance:manage"
    ANALYTICS_READ = "analytics:read"

    # System
    SETTINGS_MANAGE = "settings:manage"
    NOTIFICATION_READ = "notification:read"
    NOTIFICATION_SEND = "notification:send"

    # Communications / chats
    MESSAGE_READ = "message:read"
    MESSAGE_SEND = "message:send"
    MESSAGE_MANAGE = "message:manage"


# Иерархия ролей: кто кого может управлять
ROLE_HIERARCHY = {
    Role.OWNER: [Role.SUPER_ADMIN, Role.ADMIN, Role.METHODIST, Role.TEACHER, Role.MANAGER, Role.STUDENT, Role.PARENT, Role.GUEST],
    Role.SUPER_ADMIN: [Role.ADMIN, Role.METHODIST, Role.TEACHER, Role.MANAGER, Role.STUDENT, Role.PARENT, Role.GUEST],
    Role.ADMIN: [Role.METHODIST, Role.TEACHER, Role.MANAGER, Role.STUDENT, Role.PARENT, Role.GUEST],
    Role.METHODIST: [Role.TEACHER, Role.STUDENT],
    Role.TEACHER: [Role.STUDENT, Role.PARENT],
    Role.MANAGER: [Role.STUDENT, Role.PARENT],
    Role.STUDENT: [],
    Role.PARENT: [],
    Role.GUEST: [],
}


# Права доступа к модулям (legacy, оставлено для совместимости)
MODULE_PERMISSIONS = {
    "users": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN],
    "organizations": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN],
    "courses_manage": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN, Role.METHODIST],
    "courses_view": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN, Role.METHODIST, Role.TEACHER, Role.STUDENT],
    "homework_review": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN, Role.METHODIST],
    "crm": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
    "finance": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN],
    "analytics": [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
    "settings": [Role.OWNER, Role.SUPER_ADMIN],
    "student_world": [Role.STUDENT],
    "parent_cabinet": [Role.PARENT],
}


# Разрешения по ролям
ROLE_PERMISSIONS = {
    Role.OWNER: [p for p in Permission],
    Role.SUPER_ADMIN: [p for p in Permission],
    Role.ADMIN: [
        Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE,
        Permission.ORGANIZATION_MANAGE, Permission.BRANCH_MANAGE,
        Permission.COURSE_CREATE, Permission.COURSE_READ, Permission.COURSE_UPDATE, Permission.COURSE_DELETE, Permission.COURSE_PUBLISH,
        Permission.MODULE_CREATE, Permission.MODULE_READ, Permission.MODULE_UPDATE, Permission.MODULE_DELETE,
        Permission.LESSON_CREATE, Permission.LESSON_READ, Permission.LESSON_UPDATE, Permission.LESSON_DELETE,
        Permission.GROUP_READ, Permission.GROUP_MANAGE, Permission.ENROLLMENT_MANAGE, Permission.PROGRESS_READ,
        Permission.HOMEWORK_REVIEW, Permission.ATTENDANCE_MANAGE,
        Permission.TASK_READ, Permission.TASK_CREATE, Permission.TASK_UPDATE, Permission.TASK_DELETE,
        Permission.CRM_MANAGE, Permission.FINANCE_MANAGE, Permission.ANALYTICS_READ,
        Permission.NOTIFICATION_READ, Permission.NOTIFICATION_SEND,
        Permission.MESSAGE_READ, Permission.MESSAGE_SEND, Permission.MESSAGE_MANAGE,
    ],
    Role.METHODIST: [
        Permission.USER_READ,
        Permission.COURSE_CREATE, Permission.COURSE_READ, Permission.COURSE_UPDATE, Permission.COURSE_DELETE, Permission.COURSE_PUBLISH,
        Permission.MODULE_CREATE, Permission.MODULE_READ, Permission.MODULE_UPDATE, Permission.MODULE_DELETE,
        Permission.LESSON_CREATE, Permission.LESSON_READ, Permission.LESSON_UPDATE, Permission.LESSON_DELETE,
        Permission.HOMEWORK_REVIEW,
        Permission.GROUP_READ, Permission.GROUP_MANAGE, Permission.ENROLLMENT_MANAGE, Permission.PROGRESS_READ,
        Permission.ATTENDANCE_MANAGE,
        Permission.TASK_READ, Permission.TASK_CREATE, Permission.TASK_UPDATE, Permission.TASK_DELETE,
        Permission.NOTIFICATION_READ,
        Permission.MESSAGE_READ, Permission.MESSAGE_SEND, Permission.MESSAGE_MANAGE,
    ],
    Role.TEACHER: [
        Permission.COURSE_READ,
        Permission.MODULE_READ, Permission.LESSON_READ,
        Permission.GROUP_READ, Permission.PROGRESS_READ,
        Permission.ATTENDANCE_MANAGE,
        Permission.TASK_READ, Permission.TASK_CREATE, Permission.TASK_UPDATE, Permission.TASK_DELETE,
        Permission.NOTIFICATION_READ,
        Permission.MESSAGE_READ, Permission.MESSAGE_SEND,
    ],
    Role.MANAGER: [
        Permission.USER_READ, Permission.NOTIFICATION_SEND,
        Permission.COURSE_READ,
        Permission.GROUP_READ, Permission.ENROLLMENT_MANAGE, Permission.PROGRESS_READ,
        Permission.TASK_READ, Permission.TASK_CREATE, Permission.TASK_UPDATE, Permission.TASK_DELETE,
        Permission.CRM_MANAGE, Permission.FINANCE_MANAGE, Permission.ANALYTICS_READ,
        Permission.NOTIFICATION_READ,
    ],
    Role.STUDENT: [
        Permission.COURSE_READ,
        Permission.MODULE_READ, Permission.LESSON_READ, Permission.LESSON_COMPLETE,
        Permission.PROGRESS_READ, Permission.NOTIFICATION_READ,
        Permission.MESSAGE_READ, Permission.MESSAGE_SEND,
    ],
    Role.PARENT: [
        Permission.PROGRESS_READ, Permission.NOTIFICATION_READ,
    ],
    Role.GUEST: [
        Permission.COURSE_READ,
    ],
}


def has_permission(user_role: str, permission: Permission) -> bool:
    allowed = ROLE_PERMISSIONS.get(user_role, [])
    return permission in allowed


def can_manage_role(manager_role: str, target_role: str) -> bool:
    manageable = ROLE_HIERARCHY.get(Role(manager_role), [])
    return Role(target_role) in manageable


def has_module_permission(user_role: str, module: str) -> bool:
    allowed_roles = MODULE_PERMISSIONS.get(module, [])
    return Role(user_role) in allowed_roles
