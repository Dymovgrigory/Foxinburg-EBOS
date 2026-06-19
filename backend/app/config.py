from pydantic_settings import BaseSettings


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
    
    class Config:
        env_file = ".env.development"
        env_file_encoding = "utf-8"


settings = Settings()
