import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Optional[Fernet]:
    key = settings.PASSWORD_ENCRYPTION_KEY
    if not key:
        return None
    try:
        return Fernet(key)
    except Exception as exc:
        logger.error("Invalid PASSWORD_ENCRYPTION_KEY: %s", exc)
        return None


def encrypt_text(plaintext: Optional[str]) -> Optional[str]:
    """Шифрует строку симметричным ключом. Возвращает None, если ключ не настроен."""
    if not plaintext:
        return None
    fernet = _get_fernet()
    if not fernet:
        return None
    return fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_text(ciphertext: Optional[str]) -> Optional[str]:
    """Расшифровывает строку. Возвращает None при ошибке или отсутствии ключа."""
    if not ciphertext:
        return None
    fernet = _get_fernet()
    if not fernet:
        return None
    try:
        return fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.warning("Failed to decrypt ciphertext: invalid token")
        return None
    except Exception as exc:
        logger.exception("Decryption error: %s", exc)
        return None
