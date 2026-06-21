from typing import List, Optional
from fastapi import Depends, HTTPException, Query, status
from app.database import get_db
from app.models.user import User
from app.core.security import get_current_active_user, get_current_user, oauth2_scheme
from app.core.permissions import Permission, ROLE_PERMISSIONS, Role


def require_active_user(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


async def require_active_user_from_header_or_query(
    token: Optional[str] = Depends(oauth2_scheme),
    access_token: Optional[str] = Query(None),
    db=Depends(get_db),
) -> User:
    """Проверяет JWT из Authorization-заголовка или query-параметра access_token.

    Нужен для iframe/video/img, которые не могут передавать кастомные заголовки.
    """
    effective_token = token or access_token
    if not effective_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await get_current_user(effective_token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )
    return user


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
