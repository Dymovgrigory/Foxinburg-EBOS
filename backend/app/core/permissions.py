from enum import Enum
from functools import wraps
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from .security import get_current_active_user


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


# Права доступа к модулям
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


def has_permission(user: User, module: str) -> bool:
    if not user or not user.is_active:
        return False
    allowed_roles = MODULE_PERMISSIONS.get(module, [])
    return Role(user.role) in allowed_roles


def can_manage_role(manager: User, target_role: str) -> bool:
    if not manager or not manager.is_active:
        return False
    manageable = ROLE_HIERARCHY.get(Role(manager.role), [])
    return Role(target_role) in manageable


def require_role(allowed_roles: List[Role]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if Role(current_user.role) not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав доступа",
            )
        return current_user
    return role_checker


def require_active_user(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user
