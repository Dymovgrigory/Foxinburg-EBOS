import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.file import File as FileModel
from app.schemas.file import FileResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_active_user, require_permission
from app.core.permissions import Permission
from app.services.storage import upload_image
from app.utils import utc_now

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")


@router.get("")
async def list_files(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(FileModel).order_by(FileModel.created_at.desc())
    if entity_type:
        query = query.where(FileModel.entity_type == entity_type)
    if entity_id:
        query = query.where(FileModel.entity_id == entity_id)
    result = await db.execute(query)
    files = result.scalars().all()
    return success_response(
        data=[FileResponse.model_validate(f).model_dump() for f in files],
        message="Список файлов",
    )


@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{utc_now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    storage_path = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(storage_path, "wb") as f:
        f.write(content)

    file_record = FileModel(
        original_name=file.filename,
        storage_path=storage_path,
        public_url=f"/uploads/{filename}",
        mime_type=file.content_type,
        size_bytes=len(content),
        uploaded_by_id=current_user.id,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(file_record)
    await db.commit()
    await db.refresh(file_record)
    return success_response(
        data=FileResponse.model_validate(file_record).model_dump(),
        message="Файл загружен",
        status_code=201,
    )


@router.post("/upload-image")
async def upload_image_file(
    file: UploadFile = FastAPIFile(...),
    entity_type: Optional[str] = Form("school_asset"),
    current_user=Depends(require_permission(Permission.ORGANIZATION_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        public_url = await upload_image(file, folder=entity_type or "school")
    except ValueError as exc:
        return error_response(str(exc), status_code=400)

    file_record = FileModel(
        original_name=file.filename,
        storage_path=public_url,
        public_url=public_url,
        file_type="image",
        mime_type=file.content_type,
        uploaded_by_id=current_user.id,
        entity_type=entity_type,
    )
    db.add(file_record)
    await db.commit()
    await db.refresh(file_record)
    return success_response(
        data=FileResponse.model_validate(file_record).model_dump(),
        message="Изображение загружено",
        status_code=201,
    )


@router.get("/{file_id}")
async def get_file(
    file_id: int,
    current_user=Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    file_record = await db.get(FileModel, file_id)
    if not file_record:
        return error_response("Файл не найден", status_code=404)
    return success_response(data=FileResponse.model_validate(file_record).model_dump())


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    current_user=Depends(require_permission(Permission.LESSON_DELETE)),
    db: AsyncSession = Depends(get_db),
):
    file_record = await db.get(FileModel, file_id)
    if not file_record:
        return error_response("Файл не найден", status_code=404)
    try:
        if os.path.exists(file_record.storage_path):
            os.remove(file_record.storage_path)
    except OSError:
        pass
    await db.delete(file_record)
    await db.commit()
    return success_response(message="Файл удалён")
