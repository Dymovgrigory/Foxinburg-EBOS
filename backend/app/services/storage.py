import os
import uuid
from datetime import datetime
from typing import BinaryIO

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.config import settings
from app.utils import utc_now


ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
    )


def _local_upload(content: bytes, folder: str, ext: str) -> str:
    upload_dir = os.path.join("uploads", folder)
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    path = os.path.join(upload_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    return f"/uploads/{folder}/{filename}"


def _s3_upload(content: bytes, key: str) -> str:
    client = _s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=content,
        ACL="public-read",
    )
    base = settings.S3_PUBLIC_URL.rstrip("/") or f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET}"
    return f"{base}/{key}"


async def upload_image(file: UploadFile, folder: str = "school") -> str:
    """Upload an image to S3 (if configured) or local storage."""
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(
            f"Недопустимый тип файла: {file.content_type}. Разрешены: PNG, JPG, SVG, WebP."
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise ValueError("Размер файла не должен превышать 5 МБ.")

    ext = ALLOWED_IMAGE_TYPES[file.content_type]
    filename = f"{utc_now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"

    if settings.S3_BUCKET and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY:
        key = f"{folder}/{filename}"
        return _s3_upload(content, key)

    return _local_upload(content, folder, ext)
