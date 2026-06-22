import os

from pydantic import model_validator
from pydantic_settings import BaseSettings


_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env.development")

# Секреты, которые нельзя использовать в продакшене
_FORBIDDEN_SECRETS = {
    "",
    "dev-secret-change-in-production",
    "dev-refresh-secret-change-in-production",
    "change-me-in-production",
    "change_me",
    "change_me_in_env",
    "foxinburg_dev_pass",
    "foxinburg_redis_pass",
}

_DEFAULT_PASSWORD_SUBSTRINGS = {
    "foxinburg_dev_pass",
    "foxinburg_redis_pass",
    "change_me",
    "change_me_in_env",
}


class Settings(BaseSettings):
    NODE_ENV: str = "development"
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "foxinburg"
    DB_PASSWORD: str = "foxinburg_dev_pass"
    DB_NAME: str = "foxinburg"
    DATABASE_URL: str = "postgresql+asyncpg://foxinburg:foxinburg_dev_pass@localhost:5432/foxinburg"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "foxinburg_redis_pass"
    REDIS_URL: str = "redis://:foxinburg_redis_pass@localhost:6379"
    
    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_EXPIRES_IN: str = "24h"
    JWT_REFRESH_SECRET: str = "dev-refresh-secret-change-in-production"
    JWT_REFRESH_EXPIRES_IN: str = "7d"
    
    # Platform
    PLATFORM_URL: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:5173"
    
    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_SECURE: bool = False
    FROM_EMAIL: str = "noreply@foxinburg.ru"
    FROM_NAME: str = "FOXINBURG"

    # Teacher Academy / Yandex Disk
    YANDEX_DISK_TOKEN: str = ""
    YANDEX_DISK_PUBLIC_FOLDER: str = ""

    # AI Assistant / YandexGPT
    YANDEXGPT_API_KEY: str = ""
    YANDEXGPT_FOLDER_ID: str = ""

    # Content protection (Teacher Academy)
    CONTENT_TOKEN_SECRET: str = ""
    CONTENT_TOKEN_MAX_AGE: int = 600  # 10 минут
    CONTENT_TOKEN_MAX_USES: int = 100

    # Telegram notifications
    TELEGRAM_BOT_TOKEN: str = ""

    # Password encryption (for owner/superadmin access to user passwords in admin)
    PASSWORD_ENCRYPTION_KEY: str = ""

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        if self.NODE_ENV != "production":
            return self

        secret_fields = [
            ("JWT_SECRET", self.JWT_SECRET),
            ("JWT_REFRESH_SECRET", self.JWT_REFRESH_SECRET),
            ("CONTENT_TOKEN_SECRET", self.CONTENT_TOKEN_SECRET),
            ("PASSWORD_ENCRYPTION_KEY", self.PASSWORD_ENCRYPTION_KEY),
        ]
        for name, value in secret_fields:
            if value in _FORBIDDEN_SECRETS:
                raise ValueError(
                    f"{name} must be set to a strong unique value in production. "
                    "Check your .env.production file."
                )

        if any(sub in self.DATABASE_URL for sub in _DEFAULT_PASSWORD_SUBSTRINGS):
            raise ValueError(
                "DATABASE_URL contains a default/weak password in production. "
                "Set a strong POSTGRES_PASSWORD in .env.production."
            )

        if any(sub in self.REDIS_URL for sub in _DEFAULT_PASSWORD_SUBSTRINGS):
            raise ValueError(
                "REDIS_URL contains a default/weak password in production. "
                "Set a strong REDIS_PASSWORD in .env.production."
            )

        return self

    class Config:
        env_file = _ENV_PATH
        env_file_encoding = "utf-8"


settings = Settings()
