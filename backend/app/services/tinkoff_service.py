import hashlib
import hmac
import json
import logging
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TINKOFF_SUCCESS_STATUSES = {"AUTHORIZED", "CONFIRMED"}
TINKOFF_PAYMENT_METHOD_SBP = "SBP"


class TinkoffService:
    @staticmethod
    def _sign_payload(payload: dict) -> str:
        """Генерирует токен запроса/уведомления по правилам Тинькофф.

        Алгоритм:
        - берутся скалярные поля (без Token, Receipt, DATA, Shops);
        - добавляется Password;
        - сортируются по ключу;
        - значения конкатенируются;
        - SHA-256 hex.
        """
        sign_data = {}
        for key, value in payload.items():
            if key in ("Token", "Receipt", "DATA", "Shops"):
                continue
            if value is None or value == "":
                continue
            if isinstance(value, (dict, list)):
                continue
            sign_data[key] = str(value)

        sign_data["Password"] = settings.TINKOFF_TERMINAL_PASSWORD

        parts = []
        for key in sorted(sign_data.keys()):
            parts.append(sign_data[key])

        raw = "".join(parts)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _validate_notification(payload: dict) -> bool:
        received = payload.get("Token")
        if not received:
            return False
        computed = TinkoffService._sign_payload(payload)
        return hmac.compare_digest(computed, received)

    @staticmethod
    def _is_configured() -> bool:
        return bool(settings.TINKOFF_TERMINAL_KEY and settings.TINKOFF_TERMINAL_PASSWORD)

    @staticmethod
    async def init_payment(
        order_id: int,
        amount: int,
        description: str,
        email: Optional[str],
        phone: Optional[str],
        items: list[dict],
    ) -> dict:
        if not TinkoffService._is_configured():
            raise RuntimeError("Tinkoff terminal is not configured")

        order_id_str = str(order_id)
        return_url = f"{settings.MAX_MINIAPP_URL}?order_id={order_id}"
        notification_url = f"{settings.PLATFORM_URL.rstrip('/')}/api/v3/store/tinkoff/webhook"

        receipt = None
        if items:
            receipt = {
                "Email": email or "",
                "Phone": phone or "",
                "Taxation": "patent",
                "Items": [
                    {
                        "Name": it["title"],
                        "Price": it["price"],
                        "Quantity": it["quantity"],
                        "Amount": it["price"] * it["quantity"],
                        "Tax": "none",
                    }
                    for it in items
                ],
            }

        data: dict[str, Any] = {
            "TerminalKey": settings.TINKOFF_TERMINAL_KEY,
            "Amount": amount,
            "OrderId": order_id_str,
            "Description": description,
            "CustomerKey": f"user_{order_id}",
            "SuccessURL": return_url,
            "FailURL": return_url,
            "NotificationURL": notification_url,
        }
        if email or phone:
            data["DATA"] = {}
            if email:
                data["DATA"]["Email"] = email
            if phone:
                data["DATA"]["Phone"] = phone
        if receipt:
            data["Receipt"] = receipt

        data["Token"] = TinkoffService._sign_payload(data)

        url = f"{settings.TINKOFF_API_URL.rstrip('/')}/Init"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            result = response.json()

        if not result.get("Success"):
            logger.error("Tinkoff Init failed: %s", result)
            raise RuntimeError(result.get("Message") or "Tinkoff Init failed")

        return {
            "payment_id": str(result.get("PaymentId")),
            "payment_url": result.get("PaymentURL"),
        }

    @staticmethod
    async def handle_notification(payload: dict) -> Optional[dict]:
        if not TinkoffService._is_configured():
            logger.warning("Tinkoff notification received but not configured")
            return None

        if not TinkoffService._validate_notification(payload):
            logger.warning("Tinkoff notification token mismatch")
            return None

        status = payload.get("Status")
        success = status in TINKOFF_SUCCESS_STATUSES
        payment_id = str(payload.get("PaymentId")) if payload.get("PaymentId") else None
        order_id = payload.get("OrderId")
        amount = payload.get("Amount")

        return {
            "success": success,
            "status": status,
            "payment_id": payment_id,
            "order_id": order_id,
            "amount": amount,
        }
