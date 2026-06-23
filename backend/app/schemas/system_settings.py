from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SystemSettingsBase(BaseModel):
    # Школа
    school_name: Optional[str] = None
    school_legal_name: Optional[str] = None
    school_address: Optional[str] = None
    school_phone: Optional[str] = None
    school_email: Optional[str] = None
    school_website: Optional[str] = None
    school_logo_url: Optional[str] = None
    school_timezone: Optional[str] = "Europe/Moscow"
    school_currency: Optional[str] = "RUB"

    # Платформа
    platform_default_language: Optional[str] = "ru"
    platform_registration_enabled: Optional[bool] = True
    platform_maintenance_mode: Optional[bool] = False
    platform_max_file_size_mb: Optional[int] = 10

    # SMTP
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = Field(default=None, exclude=True)
    smtp_use_tls: Optional[bool] = True
    smtp_sender_name: Optional[str] = None
    smtp_sender_email: Optional[str] = None

    # SMS
    sms_provider: Optional[str] = None
    sms_api_key: Optional[str] = Field(default=None, exclude=True)
    sms_sender_name: Optional[str] = None

    # Telegram
    telegram_bot_token: Optional[str] = Field(default=None, exclude=True)
    telegram_channel_id: Optional[str] = None
    telegram_notifications_enabled: Optional[bool] = False

    # Yandex
    yandex_client_id: Optional[str] = None
    yandex_client_secret: Optional[str] = Field(default=None, exclude=True)
    yandex_redirect_uri: Optional[str] = None
    yandex_disk_enabled: Optional[bool] = False
    yandex_calendar_enabled: Optional[bool] = False


class SystemSettingsUpdate(BaseModel):
    school_name: Optional[str] = None
    school_legal_name: Optional[str] = None
    school_address: Optional[str] = None
    school_phone: Optional[str] = None
    school_email: Optional[str] = None
    school_website: Optional[str] = None
    school_logo_url: Optional[str] = None
    school_timezone: Optional[str] = None
    school_currency: Optional[str] = None

    platform_default_language: Optional[str] = None
    platform_registration_enabled: Optional[bool] = None
    platform_maintenance_mode: Optional[bool] = None
    platform_max_file_size_mb: Optional[int] = None

    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    smtp_sender_name: Optional[str] = None
    smtp_sender_email: Optional[str] = None

    sms_provider: Optional[str] = None
    sms_api_key: Optional[str] = None
    sms_sender_name: Optional[str] = None

    telegram_bot_token: Optional[str] = None
    telegram_channel_id: Optional[str] = None
    telegram_notifications_enabled: Optional[bool] = None

    yandex_client_id: Optional[str] = None
    yandex_client_secret: Optional[str] = None
    yandex_redirect_uri: Optional[str] = None
    yandex_disk_enabled: Optional[bool] = None
    yandex_calendar_enabled: Optional[bool] = None


class SystemSettingsOut(SystemSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
