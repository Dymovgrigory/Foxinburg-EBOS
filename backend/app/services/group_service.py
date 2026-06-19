from typing import List, Optional
from sqlalchemy import select

from app.models.group import Group
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class GroupService(BaseService[Group]):
    model = Group

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, group_id: int) -> Optional[Group]:
        result = await self.uow.session.execute(select(Group).where(Group.id == group_id))
        return result.scalar_one_or_none()

    async def list_groups(self, *, limit: int = 100, offset: int = 0) -> List[Group]:
        result = await self.uow.session.execute(select(Group).limit(limit).offset(offset))
        return list(result.scalars().all())

    async def create_group(
        self,
        *,
        name: str,
        description: Optional[str] = None,
        branch_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        course_id: Optional[int] = None,
        max_students: int = 12,
        schedule: Optional[str] = None,
    ) -> Group:
        group = Group(
            name=name,
            description=description,
            branch_id=branch_id,
            teacher_id=teacher_id,
            course_id=course_id,
            max_students=max_students,
            schedule=schedule,
        )
        await self.add(group)
        return group
