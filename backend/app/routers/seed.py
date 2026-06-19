from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.permissions import Role
from app.core.dependencies import require_role
from app.core.responses import success_response, error_response
from app.seeders import seed_all, clear_all

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("")
async def seed_database(
    current_user=Depends(require_role([Role.OWNER, Role.SUPER_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
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
    try:
        await clear_all(db)
        return success_response(message="База данных очищена")
    except Exception as e:
        return error_response(f"Ошибка очистки: {str(e)}", status_code=500)
