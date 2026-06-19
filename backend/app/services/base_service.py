from typing import Generic, TypeVar, Type, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import DeclarativeMeta
from app.services.unit_of_work import UnitOfWork


ModelType = TypeVar("ModelType", bound=DeclarativeMeta)


class BaseService(Generic[ModelType]):
    """Базовый сервис с CRUD-операциями поверх UnitOfWork."""

    model: Type[ModelType]

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get(self, obj_id: int) -> Optional[ModelType]:
        result = await self.uow.session.execute(select(self.model).where(self.model.id == obj_id))
        return result.scalar_one_or_none()

    async def get_many(self, *, limit: int = 100, offset: int = 0) -> List[ModelType]:
        result = await self.uow.session.execute(
            select(self.model).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def add(self, obj: ModelType) -> ModelType:
        self.uow.session.add(obj)
        await self.uow.session.flush()
        await self.uow.session.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.uow.session.delete(obj)
