from typing import Optional
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash
from app.core.permissions import can_manage_role
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService
from app.services.audit_service import AuditService


class UserService(BaseService[User]):
    model = User

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.uow.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> Optional[User]:
        return await self.get(user_id)

    async def create_user(
        self,
        *,
        email: str,
        name: str,
        password: str,
        role: str,
        plan: str = "FREE",
        target_language: str = "en",
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        group_id: Optional[int] = None,
        current_user: Optional[User] = None,
    ) -> User:
        if current_user and not can_manage_role(current_user.role, role):
            raise ValueError("Вы не можете назначить эту роль")

        email = email.lower().strip()
        existing = await self.get_by_email(email)
        if existing:
            raise ValueError("Email уже зарегистрирован")

        user = User(
            email=email,
            name=name,
            password_hash=get_password_hash(password),
            role=role,
            plan=plan,
            target_language=target_language,
            organization_id=organization_id,
            branch_id=branch_id,
            group_id=group_id,
        )
        await self.add(user)

        await AuditService.log_action(
            self.uow,
            action="CREATE",
            entity_type="user",
            entity_id=user.id,
            new_values={
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "plan": user.plan,
                "organization_id": user.organization_id,
                "branch_id": user.branch_id,
                "group_id": user.group_id,
            },
            user_id=current_user.id if current_user else None,
        )
        return user

    async def update_last_login(self, user: User) -> None:
        from datetime import datetime
        user.last_login_at = datetime.utcnow()
        await self.uow.session.flush()
