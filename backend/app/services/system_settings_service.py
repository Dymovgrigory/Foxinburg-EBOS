from sqlalchemy import select
from typing import Optional

from app.models.system_settings import SystemSettings
from app.services.unit_of_work import UnitOfWork
from app.services.base_service import BaseService


class SystemSettingsService(BaseService[SystemSettings]):
    model = SystemSettings

    def __init__(self, uow: UnitOfWork):
        super().__init__(uow)

    async def get_or_create(self) -> SystemSettings:
        result = await self.uow.session.execute(select(SystemSettings).where(SystemSettings.id == 1))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = SystemSettings(id=1)
            self.uow.session.add(settings)
            await self.uow.session.flush()
            await self.uow.session.refresh(settings)
        return settings

    async def update(self, data: dict) -> SystemSettings:
        settings = await self.get_or_create()
        for field, value in data.items():
            if value is not None or field in {
                "smtp_password",
                "sms_api_key",
                "telegram_bot_token",
                "yandex_client_secret",
            }:
                setattr(settings, field, value)
        await self.uow.session.flush()
        await self.uow.session.refresh(settings)
        return settings
