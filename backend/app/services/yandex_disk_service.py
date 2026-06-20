import re
from typing import List, Optional

import httpx

from app.config import settings


YANDEX_DISK_API_URL = "https://cloud-api.yandex.net/v1/disk/public/resources"


def _extract_public_key(public_url: str) -> str:
    """Извлекает публичный ключ из ссылки на Яндекс.Диск."""
    # Ссылка вида https://disk.yandex.ru/d/<public_key>
    return public_url.strip()


def _module_order(title: str) -> int:
    """Извлекает числовой префикс из названия папки для сортировки модулей."""
    match = re.match(r"^(\d+)", title.strip())
    return int(match.group(1)) if match else 9999


class YandexDiskItem:
    def __init__(self, data: dict):
        self.path: str = data.get("path", "")
        self.name: str = data.get("name", "")
        self.type: str = data.get("type", "")
        self.mime_type: str = data.get("mime_type", "")
        self.size: int = data.get("size", 0)
        self.md5: str = data.get("md5", "")
        self.file_url: Optional[str] = data.get("file")
        self.public_url: Optional[str] = data.get("public_url")
        self.preview: Optional[str] = data.get("preview")


class YandexDiskService:
    def __init__(self, token: Optional[str] = None, public_folder: Optional[str] = None):
        self.token = token or settings.YANDEX_DISK_TOKEN
        self.public_folder = public_folder or settings.YANDEX_DISK_PUBLIC_FOLDER

    async def _request(self, path: str = "") -> dict:
        params = {"public_key": _extract_public_key(self.public_folder)}
        if path:
            params["path"] = path
        headers = {"Authorization": f"OAuth {self.token}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(YANDEX_DISK_API_URL, params=params, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()

    async def list_modules(self) -> List[dict]:
        """Возвращает список подпапок (модулей) в папке курса.

        Если по публичной ссылке открывается одна обёрточная папка без файлов,
        спускаемся внутрь неё.
        """
        data = await self._request()
        items = data.get("_embedded", {}).get("items", [])
        dirs = [item for item in items if item.get("type") == "dir"]
        files = [item for item in items if item.get("type") == "file"]

        # Если в корне только одна папка и нет файлов — это, скорее всего,
        # обёрточная папка; заходим внутрь.
        if len(dirs) == 1 and not files:
            data = await self._request(dirs[0]["path"])
            items = data.get("_embedded", {}).get("items", [])
            modules = [item for item in items if item.get("type") == "dir"]
        else:
            modules = dirs

        modules.sort(key=lambda item: _module_order(item.get("name", "")))
        return modules

    async def list_module_files(self, module_path: str) -> List[YandexDiskItem]:
        """Возвращает файлы внутри модуля."""
        data = await self._request(module_path)
        items = data.get("_embedded", {}).get("items", [])
        files = [YandexDiskItem(item) for item in items if item.get("type") == "file"]
        return files

    def detect_content_type(self, mime_type: str) -> str:
        if mime_type.startswith("video/"):
            return "video"
        if mime_type == "application/pdf":
            return "pdf"
        if mime_type in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            return "file"
        if mime_type.startswith("image/"):
            return "file"
        return "file"
