from typing import List
from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.core.security import get_current_active_user
from app.core.permissions import Permission, ROLE_PERMISSIONS, Role


def require_active_user(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


def require_role(allowed_roles: List[Role]):
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if Role(current_user.role) not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав доступа",
            )
        return current_user
    return role_checker


def require_permission(permission: Permission):
    async def checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователь заблокирован",
            )
        allowed = ROLE_PERMISSIONS.get(current_user.role, [])
        if permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав доступа",
            )
        return current_user
    return checker


def require_any_permission(*permissions: Permission):
    async def checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователь заблокирован",
            )
        allowed = ROLE_PERMISSIONS.get(current_user.role, [])
        if not any(p in allowed for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав доступа",
            )
        return current_user
    return checker
