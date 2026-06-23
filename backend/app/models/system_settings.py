from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime

from app.database import Base
from app.utils import utc_now


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)

    # Школа
    school_name = Column(String, nullable=True)
    school_legal_name = Column(String, nullable=True)
    school_address = Column(Text, nullable=True)
    school_phone = Column(String, nullable=True)
    school_email = Column(String, nullable=True)
    school_website = Column(String, nullable=True)
    school_logo_url = Column(String, nullable=True)
    school_timezone = Column(String, nullable=False, default="Europe/Moscow")
    school_currency = Column(String, nullable=False, default="RUB")

    # Платформа
    platform_default_language = Column(String, nullable=False, default="ru")
    platform_registration_enabled = Column(Boolean, nullable=False, default=True)
    platform_maintenance_mode = Column(Boolean, nullable=False, default=False)
    platform_max_file_size_mb = Column(Integer, nullable=False, default=10)

    # SMTP
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_username = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    smtp_use_tls = Column(Boolean, nullable=False, default=True)
    smtp_sender_name = Column(String, nullable=True)
    smtp_sender_email = Column(String, nullable=True)

    # SMS
    sms_provider = Column(String, nullable=True)
    sms_api_key = Column(String, nullable=True)
    sms_sender_name = Column(String, nullable=True)

    # Telegram
    telegram_bot_token = Column(String, nullable=True)
    telegram_channel_id = Column(String, nullable=True)
    telegram_notifications_enabled = Column(Boolean, nullable=False, default=False)

    # Yandex
    yandex_client_id = Column(String, nullable=True)
    yandex_client_secret = Column(String, nullable=True)
    yandex_redirect_uri = Column(String, nullable=True)
    yandex_disk_enabled = Column(Boolean, nullable=False, default=False)
    yandex_calendar_enabled = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    def __repr__(self):
        return "<SystemSettings>"
