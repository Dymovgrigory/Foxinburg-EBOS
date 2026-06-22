import os

import pytest
from pydantic import ValidationError


class TestProductionConfigValidation:
    """Проверка валидации критических секретов в продакшене."""

    @pytest.fixture(autouse=True)
    def _reset_env(self):
        # Сохраняем и восстанавливаем переменные окружения после каждого теста
        original = os.environ.copy()
        yield
        os.environ.clear()
        os.environ.update(original)

    def _import_settings(self):
        # Импортируем заново, чтобы pydantic-settings перечитал переменные
        import importlib
        from app import config

        importlib.reload(config)
        return config.Settings()

    def _set_valid_production_env(self):
        os.environ["NODE_ENV"] = "production"
        os.environ["DATABASE_URL"] = "postgresql+asyncpg://foxinburg:StrongDBPass123@postgres:5432/foxinburg"
        os.environ["REDIS_URL"] = "redis://:StrongRedisPass123@redis:6379/0"
        os.environ["JWT_SECRET"] = "super-strong-jwt-secret-for-tests-only-32bytes"
        os.environ["JWT_REFRESH_SECRET"] = "super-strong-refresh-secret-for-tests-only-32bytes"
        os.environ["CONTENT_TOKEN_SECRET"] = "super-strong-content-secret-for-tests-only-32bytes"
        os.environ["PASSWORD_ENCRYPTION_KEY"] = "xKGm1ySf1VtWfrOwu6uv1p6E0F-wpCObX7fxo_AhmvU="

    def test_valid_production_config_passes(self):
        self._set_valid_production_env()
        settings = self._import_settings()
        assert settings.NODE_ENV == "production"
        assert settings.JWT_SECRET == "super-strong-jwt-secret-for-tests-only-32bytes"

    @pytest.mark.parametrize(
        "field_name, forbidden_value",
        [
            ("JWT_SECRET", "dev-secret-change-in-production"),
            ("JWT_SECRET", "change-me-in-production"),
            ("JWT_SECRET", ""),
            ("JWT_REFRESH_SECRET", "dev-refresh-secret-change-in-production"),
            ("JWT_REFRESH_SECRET", "change-me-in-production"),
            ("JWT_REFRESH_SECRET", ""),
            ("CONTENT_TOKEN_SECRET", ""),
            ("PASSWORD_ENCRYPTION_KEY", ""),
        ],
    )
    def test_forbidden_secret_values_fail(self, field_name, forbidden_value):
        self._set_valid_production_env()
        os.environ[field_name] = forbidden_value
        with pytest.raises(ValidationError) as exc_info:
            self._import_settings()
        assert field_name in str(exc_info.value)

    @pytest.mark.parametrize(
        "env_var, url_value",
        [
            ("DATABASE_URL", "postgresql+asyncpg://foxinburg:foxinburg_dev_pass@postgres:5432/foxinburg"),
            ("DATABASE_URL", "postgresql+asyncpg://foxinburg:change_me@postgres:5432/foxinburg"),
            ("REDIS_URL", "redis://:foxinburg_redis_pass@redis:6379/0"),
            ("REDIS_URL", "redis://:change_me@redis:6379/0"),
        ],
    )
    def test_default_database_or_redis_passwords_fail(self, env_var, url_value):
        self._set_valid_production_env()
        os.environ[env_var] = url_value
        with pytest.raises(ValidationError) as exc_info:
            self._import_settings()
        assert env_var in str(exc_info.value)

    def test_development_allows_default_secrets(self):
        os.environ["NODE_ENV"] = "development"
        # В development используются дефолтные значения из config.py
        settings = self._import_settings()
        assert settings.NODE_ENV == "development"
        assert settings.JWT_SECRET == "dev-secret-change-in-production"
