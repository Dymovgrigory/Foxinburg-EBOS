from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.course import Module, Lesson
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class ModuleService(BaseService[Module]):
    model = Module

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_by_id(self, module_id: int) -> Optional[Module]:
        result = await self.uow.session.execute(select(Module).where(Module.id == module_id))
        return result.scalar_one_or_none()

    async def list_by_course(self, course_id: int) -> List[Module]:
        result = await self.uow.session.execute(
            select(Module)
            .where(Module.course_id == course_id)
            .order_by(Module.order_index)
            .options(selectinload(Module.lessons))
        )
        return list(result.scalars().all())

    async def create_module(
        self,
        *,
        course_id: int,
        title: str,
        description: Optional[str] = None,
        order_index: int = 0,
        is_active: bool = True,
    ) -> Module:
        module = Module(
            course_id=course_id,
            title=title,
            description=description,
            order_index=order_index,
            is_active=is_active,
        )
        await self.add(module)
        return module

    async def update_module(
        self,
        module: Module,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        order_index: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Module:
        if title is not None:
            module.title = title
        if description is not None:
            module.description = description
        if order_index is not None:
            module.order_index = order_index
        if is_active is not None:
            module.is_active = is_active
        await self.uow.session.flush()
        await self.uow.session.refresh(module)
        return module

    async def delete_module(self, module: Module) -> None:
        await self.uow.session.delete(module)
