from typing import Any, Optional
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "Успешно"
    data: Any = None
    meta: Optional[dict] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str = "Ошибка"
    errors: Any = None
    data: Any = None
