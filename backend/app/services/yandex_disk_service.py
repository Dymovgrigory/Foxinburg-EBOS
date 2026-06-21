import re
from typing import List, Optional
from urllib.parse import unquote

import httpx

from app.config import settings


YANDEX_DISK_API_BASE = "https://cloud-api.yandex.net/v1/disk"


def _extract_public_key(public_url: str) -> str:
    """Возвращает публичную ссылку в чистом виде."""
    return public_url.strip()


def _module_order(title: str) -> int:
    """Извлекает числовой префикс из названия папки для сортировки модулей."""
    match = re.match(r"^(\d+)", title.strip())
    return int(match.group(1)) if match else 9999


def _file_order(title: str) -> int:
    """Извлекает числовой префикс из названия файла для сортировки."""
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
        self._client = httpx.AsyncClient(timeout=60.0, follow_redirects=True)

    def _headers(self) -> dict:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"OAuth {self.token}"
        return headers

    async def _request(self, endpoint: str, params: dict) -> dict:
        url = f"{YANDEX_DISK_API_BASE}/{endpoint}"
        response = await self._client.get(url, params=params, headers=self._headers())
        response.raise_for_status()
        return response.json()

    async def _public_request(self, path: str = "") -> dict:
        params = {"public_key": _extract_public_key(self.public_folder)}
        if path:
            params["path"] = path
        return await self._request("public/resources", params)

    async def _authorized_meta(self, disk_path: str) -> dict:
        """Метаданные приватного ресурса по пути вида disk:/..."""
        return await self._request("resources", {"path": disk_path, "limit": 0})

    async def _authorized_download_url(self, disk_path: str) -> str:
        """Получает свежую прямую ссылку на скачивание по пути disk:/..."""
        data = await self._request("resources/download", {"path": disk_path})
        return data.get("href", "")

    async def list_modules(self) -> List[dict]:
        """Возвращает список подпапок (модулей) в папке курса.

        Если по публичной ссылке открывается одна обёрточная папка без файлов,
        спускаемся внутрь неё.
        """
        if not self.public_folder:
            raise ValueError("YANDEX_DISK_PUBLIC_FOLDER не настроен")

        data = await self._public_request()
        items = data.get("_embedded", {}).get("items", [])
        dirs = [item for item in items if item.get("type") == "dir"]
        files = [item for item in items if item.get("type") == "file"]

        if len(dirs) == 1 and not files:
            data = await self._public_request(dirs[0]["path"])
            items = data.get("_embedded", {}).get("items", [])
            modules = [item for item in items if item.get("type") == "dir"]
        else:
            modules = dirs

        modules.sort(key=lambda item: _module_order(item.get("name", "")))
        return modules

    async def list_module_files(self, module_path: str) -> List[YandexDiskItem]:
        """Возвращает файлы внутри модуля."""
        data = await self._public_request(module_path)
        items = data.get("_embedded", {}).get("items", [])
        files = [YandexDiskItem(item) for item in items if item.get("type") == "file"]
        files.sort(key=lambda item: _file_order(item.name))
        return files

    async def list_module_contents(self, module_path: str) -> List[dict]:
        """Возвращает и файлы, и подпапки внутри модуля."""
        data = await self._public_request(module_path)
        items = data.get("_embedded", {}).get("items", [])
        return sorted(items, key=lambda item: _file_order(item.get("name", "")))

    async def get_download_url(self, disk_path: str) -> str:
        """Возвращает актуальную прямую ссылку на файл.

        При наличии OAuth-токена используем авторизованный endpoint,
        иначе — публичный (короткоживущая ссылка из метаданных).
        """
        if self.token and disk_path.startswith("disk:"):
            try:
                return await self._authorized_download_url(disk_path)
            except httpx.HTTPStatusError:
                # Fallback на публичный ресурс
                pass

        if not self.public_folder:
            raise ValueError("Для получения ссылки нужен OAuth-токен или публичная папка")

        params = {"public_key": _extract_public_key(self.public_folder)}
        if disk_path:
            params["path"] = disk_path
        data = await self._request("public/resources", params)
        return data.get("file", "")

    async def find_file_path(self, module_title: str, file_title: str) -> Optional[str]:
        """Находит путь к файлу по названию модуля и названию файла.

        Fallback для материалов, созданных до появления поля yandex_disk_path.
        """
        modules = await self.list_modules()
        module = next((m for m in modules if m.get("name") == module_title), None)
        if not module:
            return None

        files = await self.list_module_files(module["path"])
        file = next((f for f in files if f.name == file_title), None)
        return file.path if file else None

    def detect_content_type(self, mime_type: str, file_name: str = "") -> str:
        name_lower = file_name.lower()

        if mime_type.startswith("video/"):
            return "video"

        if mime_type == "application/pdf" or name_lower.endswith(".pdf"):
            return "pdf"

        office_types = {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "application/msword": "doc",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
            "application/vnd.ms-powerpoint": "ppt",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
            "application/vnd.ms-excel": "xls",
        }
        if mime_type in office_types or any(name_lower.endswith(ext) for ext in (".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx")):
            return "office"

        if mime_type.startswith("image/") or any(
            name_lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp")
        ):
            return "image"

        if name_lower.endswith((".txt", ".rtf", ".odt", ".ods", ".odp")):
            return "document"

        return "file"
