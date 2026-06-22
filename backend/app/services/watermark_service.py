import hashlib
import io
import os
from pathlib import Path
from typing import Optional

import fitz

from app.config import settings

CACHE_DIR = Path("uploads/watermark_cache")


def _cache_key(content_id: int, user_id: int, file_md5: str, watermark_text: str) -> str:
    combined = f"{content_id}:{user_id}:{file_md5}:{watermark_text}"
    return hashlib.sha256(combined.encode()).hexdigest()


def _ensure_cache_dir() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def apply_text_watermark_to_pdf(
    pdf_bytes: bytes,
    watermark_text: str,
    *,
    content_id: int,
    user_id: int,
    file_md5: str = "",
) -> bytes:
    """Накладывает на каждую страницу PDF диагональный текстовый watermark.

    Результат кэшируется по content_id + user_id + file_md5 + watermark_text.
    """
    _ensure_cache_dir()
    cache_key = _cache_key(content_id, user_id, file_md5, watermark_text)
    cache_path = CACHE_DIR / f"{cache_key}.pdf"

    if cache_path.exists():
        return cache_path.read_bytes()

    src = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page in src:
        rect = page.rect
        center = fitz.Point(rect.width / 2, rect.height / 2)
        tw = fitz.TextWriter(rect)
        # Начальная точка (0,0) будет совмещена с центром страницы через morph
        tw.append((0, 0), watermark_text, fontsize=40)
        # Поворот watermark на 45 градусов вокруг центра страницы
        matrix = fitz.Matrix(45)
        tw.write_text(page, color=(0.85, 0.15, 0.15), morph=(center, matrix))

    output = io.BytesIO()
    src.save(output, garbage=4, deflate=True)
    src.close()
    result = output.getvalue()

    cache_path.write_bytes(result)
    return result


def get_watermark_text(*, user_email: Optional[str], user_id: int, user_name: Optional[str] = None) -> str:
    """Формирует строку watermark."""
    parts = []
    if user_name:
        parts.append(user_name.strip())
    if user_email:
        parts.append(user_email.strip())
    parts.append(f"ID:{user_id}")
    parts.append("FOXINBURG")
    return " | ".join(parts)
