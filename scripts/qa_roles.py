#!/usr/bin/env python3
"""Скрипт ролевого QA через API.

Регистрирует пользователей с ролями admin/methodist/teacher/manager/student/parent,
выполняет вход и проверяет доступность ключевых эндпоинтов.
Запускается против локального backend на http://localhost:8000.
"""

from datetime import datetime
import sys

import httpx

BASE = "http://localhost:8000/api/v3"
PASSWORD = "Qwe123!@#"

ROLES = ["admin", "methodist", "teacher", "manager", "student", "parent"]

ENDPOINTS = [
    ("GET", "/auth/me", {}),
    ("GET", "/users/me", {}),
    ("GET", "/courses", {}),
    ("GET", "/groups", {}),
    ("GET", "/groups/my", {}),
    ("GET", "/users/students", {}),
    ("GET", "/enrollments", {}),
    ("GET", "/notifications", {}),
    ("GET", "/finance/payments/me", {}),
    ("GET", "/finance/transactions/me", {}),
    ("GET", "/finance/balance", {}),
]

# Ожидаемые коды по роли на основе ROLE_PERMISSIONS.
# 200 = OK, 403 = Forbidden, 404 = Not Found (допустимо для пустых сущностей).
EXPECTED = {
    "admin": {
        "/auth/me": 200,
        "/users/me": 200,
        "/courses": 200,
        "/groups": 200,
        "/groups/my": 200,
        "/users/students": 200,
        "/enrollments": 200,
        "/notifications": 200,
        "/finance/payments/me": 200,
        "/finance/transactions/me": 200,
        "/finance/balance": 200,
    },
    "methodist": {
        "/auth/me": 200,
        "/users/me": 200,
        "/courses": 200,
        "/groups": 200,
        "/groups/my": 200,
        "/users/students": 200,
        "/enrollments": 200,
        "/notifications": 200,
        "/finance/payments/me": 200,
        "/finance/transactions/me": 200,
        "/finance/balance": 200,
    },
    "teacher": {
        "/auth/me": 200,
        "/users/me": 403,
        "/courses": 200,
        "/groups": 200,
        "/groups/my": 200,
        "/users/students": 200,
        "/enrollments": 403,
        "/notifications": 200,
        "/finance/payments/me": 200,
        "/finance/transactions/me": 200,
        "/finance/balance": 200,
    },
    "manager": {
        "/auth/me": 200,
        "/users/me": 200,
        "/courses": 200,
        "/groups": 200,
        "/groups/my": 200,
        "/users/students": 200,
        "/enrollments": 200,
        "/notifications": 200,
        "/finance/payments/me": 200,
        "/finance/transactions/me": 200,
        "/finance/balance": 200,
    },
    "student": {
        "/auth/me": 200,
        "/users/me": 403,
        "/courses": 200,
        "/groups": 403,
        "/groups/my": 200,
        "/users/students": 403,
        "/enrollments": 403,
        "/notifications": 200,
        "/finance/payments/me": 200,
        "/finance/transactions/me": 200,
        "/finance/balance": 200,
    },
    "parent": {
        "/auth/me": 200,
        "/users/me": 403,
        "/courses": 403,
        "/groups": 403,
        "/groups/my": 200,
        "/users/students": 403,
        "/enrollments": 403,
        "/notifications": 200,
        "/finance/payments/me": 200,
        "/finance/transactions/me": 200,
        "/finance/balance": 200,
    },
}


def main() -> int:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    client = httpx.Client(base_url=BASE, timeout=10)
    tokens = {}

    print("\n=== QA по ролям ===")
    print(f"Base URL: {BASE}\n")

    # 1. Регистрация и вход
    for role in ROLES:
        email = f"qa.{role}.{ts}@foxinburg-qa.ru"
        reg_resp = client.post(
            "/auth/register",
            json={"email": email, "password": PASSWORD, "name": f"QA {role}", "role": role},
        )
        if reg_resp.status_code not in (200, 201):
            print(f"[ERROR] Регистрация {role}: {reg_resp.status_code} {reg_resp.text[:200]}")
            continue

        login_resp = client.post(
            "/auth/login",
            data={"username": email, "password": PASSWORD},
        )
        if login_resp.status_code != 200:
            print(f"[ERROR] Вход {role}: {login_resp.status_code} {login_resp.text[:200]}")
            continue

        token = login_resp.json().get("data", {}).get("access_token")
        tokens[role] = token
        print(f"[OK] {role:10} зарегистрирован и вошёл")

    if not tokens:
        print("Не удалось получить ни одного токена. QA невозможен.")
        return 1

    # 2. Проверка эндпоинтов
    print("\n--- Проверка эндпоинтов ---")
    failures = []
    for role, token in tokens.items():
        print(f"\nРоль: {role}")
        headers = {"Authorization": f"Bearer {token}"}
        for method, path, params in ENDPOINTS:
            resp = client.request(method, path, headers=headers, params=params)
            actual = resp.status_code
            expected = EXPECTED.get(role, {}).get(path)
            ok = actual == expected if expected else actual in (200, 201, 403, 404)
            mark = "OK" if ok else "FAIL"
            print(f"  {mark} {method} {path}: {actual} (ожидалось {expected})")
            if not ok:
                failures.append((role, method, path, actual, expected, resp.text[:120]))

    client.close()

    # 3. Итог
    print("\n=== Итог ===")
    if failures:
        print(f"Найдено расхождений: {len(failures)}")
        for role, method, path, actual, expected, body in failures:
            print(f"  {role:10} {method} {path}: got {actual}, expected {expected} — {body}")
        return 1

    print("Все проверки прошли успешно.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
