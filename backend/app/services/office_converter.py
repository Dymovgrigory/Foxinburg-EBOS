import asyncio
import hashlib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import httpx

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


# Пути к LibreOffice на разных платформ
_POSSIBLE_SOFFICE_PATHS = [
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice.bin",
    "/usr/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "soffice",
]


def find_soffice() -> Optional[str]:
    """Находит исполняемый файл LibreOffice."""
    for path in _POSSIBLE_SOFFICE_PATHS:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
        if shutil.which(path):
            return shutil.which(path)
    return None


def _pdf_cache_dir() -> Path:
    cache_dir = _PROJECT_ROOT / "uploads" / "office_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def _pdf_cache_path(content_id: int, md5: Optional[str]) -> Path:
    key = f"{content_id}_{md5 or 'unknown'}"
    return _pdf_cache_dir() / f"{hashlib.sha256(key.encode()).hexdigest()}.pdf"


def _convert_sync(input_path: Path, output_dir: Path) -> Path:
    """Синхронная конвертация файла в PDF через LibreOffice."""
    soffice = find_soffice()
    if not soffice:
        raise RuntimeError("LibreOffice (soffice) не найден. Установите LibreOffice для просмотра Office-файлов.")

    cmd = [
        soffice,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(output_dir),
        str(input_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        raise RuntimeError(f"Ошибка конвертации LibreOffice: {result.stderr or result.stdout}")

    base_name = input_path.stem
    pdf_path = output_dir / f"{base_name}.pdf"
    if not pdf_path.exists():
        # LibreOffice иногда меняет расширение/имя
        candidates = list(output_dir.glob("*.pdf"))
        if not candidates:
            raise RuntimeError("PDF не создан после конвертации")
        pdf_path = candidates[0]
    return pdf_path


async def convert_office_to_pdf(
    content_id: int,
    source_url: str,
    source_md5: Optional[str] = None,
) -> Path:
    """Возвращает путь к PDF-версии Office-файла, кешируя результат."""
    cache_path = _pdf_cache_path(content_id, source_md5)
    if cache_path.exists() and cache_path.stat().st_size > 0:
        return cache_path

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            response = await client.get(source_url)
            response.raise_for_status()
            original_ext = _guess_extension(response.headers.get("content-type", ""))
            input_file = tmp_path / f"source{original_ext}"
            input_file.write_bytes(response.content)

        converted = await asyncio.to_thread(_convert_sync, input_file, tmp_path)
        cache_path.write_bytes(converted.read_bytes())

    return cache_path


def _guess_extension(content_type: str) -> str:
    mapping = {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "application/vnd.ms-powerpoint": ".ppt",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.ms-excel": ".xls",
    }
    return mapping.get(content_type, ".bin")


def clear_pdf_cache(content_id: int, source_md5: Optional[str] = None) -> None:
    """Удаляет закешированный PDF (например, при синхронизации)."""
    cache_path = _pdf_cache_path(content_id, source_md5)
    if cache_path.exists():
        cache_path.unlink(missing_ok=True)
