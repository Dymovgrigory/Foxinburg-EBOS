from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.permissions import Role
from app.core.dependencies import require_role
from app.core.responses import success_response, error_response
from app.config import settings
from app.seeders import seed_all, clear_all

router = APIRouter(prefix="/seed", tags=["seed"])


def _forbid_production():
    if settings.NODE_ENV == "production":
        return error_response(
            "Операция запрещена в production-окружении",
            status_code=403,
        )
    return None


@router.post("")
async def seed_database(
    current_user=Depends(require_role([Role.OWNER, Role.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    if (response := _forbid_production()):
        return response
    try:
        await seed_all(db)
        return success_response(message="База данных заполнена тестовыми данными")
    except Exception as e:
        return error_response(f"Ошибка сидирования: {str(e)}", status_code=500)


@router.delete("")
async def clear_database(
    current_user=Depends(require_role([Role.OWNER, Role.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    if (response := _forbid_production()):
        return response
    try:
        await clear_all(db)
        return success_response(message="База данных очищена")
    except Exception as e:
        return error_response(f"Ошибка очистки: {str(e)}", status_code=500)
