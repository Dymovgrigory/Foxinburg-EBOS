from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.employee_group import EmployeeGroup, employee_group_members
from app.models.user import User
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class EmployeeGroupService(BaseService[EmployeeGroup]):
    model = EmployeeGroup

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, group_id: int) -> Optional[EmployeeGroup]:
        result = await self.uow.session.execute(
            select(EmployeeGroup)
            .where(EmployeeGroup.id == group_id)
            .options(selectinload(EmployeeGroup.members))
        )
        return result.scalar_one_or_none()

    async def list_groups(self, *, group_type: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[EmployeeGroup]:
        query = select(EmployeeGroup)
        if group_type:
            query = query.where(EmployeeGroup.group_type == group_type)
        query = query.order_by(EmployeeGroup.name).limit(limit).offset(offset)
        result = await self.uow.session.execute(query)
        return list(result.scalars().all())

    async def create_group(
        self,
        *,
        name: str,
        description: Optional[str] = None,
        group_type: str = "internal",
        member_ids: Optional[List[int]] = None,
    ) -> EmployeeGroup:
        group = EmployeeGroup(
            name=name,
            description=description,
            group_type=group_type,
        )
        self.uow.session.add(group)
        await self.uow.session.flush()

        if member_ids:
            await self.add_members(group.id, member_ids)

        await self.uow.session.refresh(group)
        return group

    async def update_group(
        self,
        group_id: int,
        *,
        name: Optional[str] = None,
        description: Optional[str] = None,
        group_type: Optional[str] = None,
    ) -> Optional[EmployeeGroup]:
        group = await self.get_by_id(group_id)
        if not group:
            return None

        if name is not None:
            group.name = name
        if description is not None:
            group.description = description
        if group_type is not None:
            group.group_type = group_type

        await self.uow.session.flush()
        await self.uow.session.refresh(group)
        return group

    async def delete_group(self, group_id: int) -> bool:
        group = await self.get_by_id(group_id)
        if not group:
            return False
        await self.uow.session.delete(group)
        await self.uow.session.flush()
        return True

    async def add_members(self, group_id: int, user_ids: List[int]) -> EmployeeGroup:
        group = await self.get_by_id(group_id)
        if not group:
            raise ValueError("Группа не найдена")

        # Проверяем существование пользователей
        result = await self.uow.session.execute(select(User).where(User.id.in_(user_ids)))
        found_ids = {u.id for u in result.scalars().all()}
        missing = set(user_ids) - found_ids
        if missing:
            raise ValueError(f"Пользователи не найдены: {missing}")

        existing_ids = {m.id for m in group.members}
        new_ids = [uid for uid in user_ids if uid not in existing_ids]

        if new_ids:
            await self.uow.session.execute(
                employee_group_members.insert(),
                [{"group_id": group_id, "user_id": uid} for uid in new_ids],
            )
            await self.uow.session.flush()
            await self.uow.session.refresh(group)

        return group

    async def remove_member(self, group_id: int, user_id: int) -> EmployeeGroup:
        group = await self.get_by_id(group_id)
        if not group:
            raise ValueError("Группа не найдена")

        await self.uow.session.execute(
            employee_group_members.delete().where(
                employee_group_members.c.group_id == group_id,
                employee_group_members.c.user_id == user_id,
            )
        )
        await self.uow.session.flush()
        await self.uow.session.refresh(group)
        return group

    async def get_member_count(self, group_id: int) -> int:
        result = await self.uow.session.execute(
            select(func.count(employee_group_members.c.user_id)).where(
                employee_group_members.c.group_id == group_id
            )
        )
        return result.scalar() or 0
