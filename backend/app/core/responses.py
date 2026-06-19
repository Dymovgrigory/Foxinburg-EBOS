from typing import Any, Optional
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


def success_response(
    data: Any = None,
    message: str = "Успешно",
    meta: Optional[dict] = None,
    status_code: int = 200,
) -> JSONResponse:
    content = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        content["meta"] = meta
    return JSONResponse(status_code=status_code, content=jsonable_encoder(content))


def error_response(
    message: str = "Ошибка",
    errors: Optional[Any] = None,
    status_code: int = 400,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder({
            "success": False,
            "message": message,
            "errors": errors,
            "data": None,
        }),
    )
