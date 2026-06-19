import json
from datetime import datetime
from typing import Any, Optional
from app.services.unit_of_work import UnitOfWork


class AuditService:
    """Сервис аудита действий пользователей и системы."""

    @staticmethod
    def _serialize(values: Optional[Any]) -> Optional[str]:
        if values is None:
            return None
        return json.dumps(values, ensure_ascii=False, default=str)

    @classmethod
    async def log_action(
        cls,
        uow: UnitOfWork,
        action: str,
        entity_type: str,
        entity_id: Optional[int],
        *,
        old_values: Optional[Any] = None,
        new_values: Optional[Any] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        from app.models.event import AuditLog

        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=cls._serialize(old_values),
            new_values=cls._serialize(new_values),
            ip_address=ip_address,
            created_at=datetime.utcnow(),
        )
        uow.session.add(audit)
