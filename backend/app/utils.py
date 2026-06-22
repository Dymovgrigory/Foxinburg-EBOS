"""Общие утилиты приложения."""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Возвращает текущее время в UTC (naive, для совместимости с DateTime без timezone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
