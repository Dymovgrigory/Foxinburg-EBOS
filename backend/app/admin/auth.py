from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from app.config import settings
from app.core.permissions import Role
from app.core.security import create_access_token, decode_token, verify_password
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.user_service import UserService


ADMIN_ROLES = {Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN}


class JWTAdminAuth(AuthenticationBackend):
    """Аутентификация в админ-панели по JWT-токену, хранимому в сессии."""

    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = str(form.get("username", "")).lower().strip()
        password = str(form.get("password", ""))
        if not email or not password:
            return False

        async with UnitOfWork() as uow:
            service = UserService(uow)
            user = await service.get_by_email(email)
            if not user:
                return False
            if not user.is_active or not verify_password(password, user.password_hash):
                return False
            if Role(user.role) not in ADMIN_ROLES:
                return False

            token = create_access_token({"user_id": user.id, "role": user.role})
            request.session["admin_token"] = token
            return True

    async def logout(self, request: Request) -> bool:
        request.session.pop("admin_token", None)
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("admin_token")
        if not token:
            return False
        try:
            payload = decode_token(token)
            user_id = payload.get("user_id")
        except Exception:
            return False

        async with AsyncSessionLocal() as session:
            user = await session.get(User, user_id)
            if not user or not user.is_active:
                return False
            if Role(user.role) not in ADMIN_ROLES:
                return False
        return True
