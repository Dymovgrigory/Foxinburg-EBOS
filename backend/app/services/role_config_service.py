from typing import Dict, List
from sqlalchemy import select

from app.models.role_config import RoleConfig
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class RoleConfigCache:
    _cache: Dict[str, List[str]] = {}

    @classmethod
    def get(cls, role: str) -> List[str]:
        return cls._cache.get(role, [])

    @classmethod
    def set(cls, role: str, permissions: List[str]) -> None:
        cls._cache[role] = permissions

    @classmethod
    def delete(cls, role: str) -> None:
        cls._cache.pop(role, None)

    @classmethod
    def clear(cls) -> None:
        cls._cache.clear()


class RoleConfigService(BaseService[RoleConfig]):
    model = RoleConfig

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def load_cache(self) -> None:
        result = await self.uow.session.execute(
            select(RoleConfig).where(RoleConfig.is_active == True)
        )
        RoleConfigCache.clear()
        for config in result.scalars().all():
            RoleConfigCache.set(config.role, config.permissions or [])

    async def create(self, data: dict) -> RoleConfig:
        config = RoleConfig(**data)
        self.uow.session.add(config)
        await self.uow.session.flush()
        await self.uow.session.refresh(config)
        RoleConfigCache.set(config.role, config.permissions or [])
        return config

    async def update(self, config: RoleConfig, data: dict) -> RoleConfig:
        for field, value in data.items():
            setattr(config, field, value)
        await self.uow.session.flush()
        await self.uow.session.refresh(config)
        if config.is_active:
            RoleConfigCache.set(config.role, config.permissions or [])
        else:
            RoleConfigCache.delete(config.role)
        return config

    async def delete(self, config: RoleConfig) -> None:
        await self.uow.session.delete(config)
        await self.uow.session.flush()
        RoleConfigCache.delete(config.role)

    async def get_by_role(self, role: str) -> RoleConfig | None:
        result = await self.uow.session.execute(select(RoleConfig).where(RoleConfig.role == role))
        return result.scalar_one_or_none()

    async def list_all(self) -> List[RoleConfig]:
        result = await self.uow.session.execute(select(RoleConfig).order_by(RoleConfig.role))
        return list(result.scalars().all())
