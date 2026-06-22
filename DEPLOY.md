# Деплой FOXINBURG EBOS на сервер

## Требования

- Сервер с Ubuntu 22.04/24.04 (2 vCPU, 2 GB RAM, 10 GB диск — минимум).
- Домен `foxinburg.ru` с A-записью на IP сервера.
- Открытые порты 80 и 443.

## Быстрый старт

1. Подключиться к серверу по SSH:

```bash
ssh user@<IP_СЕРВЕРА>
```

2. Установить git и клонировать репозиторий:

```bash
sudo apt update && sudo apt install -y git
git clone <URL_РЕПОЗИТОРИЯ> /opt/foxinburg
cd /opt/foxinburg
```

3. Создать файл окружения:

```bash
cp .env.production.example .env.production
nano .env.production
```

Заполнить пароли и секреты. **Обязательно замените все значения `REPLACE_*` на сильные уникальные строки**, иначе backend не запустится в production (см. [переменные окружения](#переменные-окружения)).

4. Запустить деплой:

```bash
sudo bash scripts/deploy.sh
```

Скрипт автоматически:
- установит Docker и Docker Compose,
- соберёт образы backend и frontend,
- получит SSL-сертификат Let’s Encrypt,
- запустит PostgreSQL, Redis, backend, nginx,
- применит миграции Alembic,
- настроит автообновление SSL.

5. Открыть сайт:

```
https://foxinburg.ru
```

## DNS

В управлении доменом `foxinburg.ru` (Yandex Cloud / Яндекс.Бизнес) создать A-запись:

```
foxinburg.ru → <IP_СЕРВЕРА>
www.foxinburg.ru → <IP_СЕРВЕРА>
```

## Переменные окружения

Файл `.env.production` передаётся в контейнер backend через `docker-compose.prod.yml`.

### Обязательные

| Переменная | Описание | Как сгенерировать |
|------------|----------|-------------------|
| `POSTGRES_PASSWORD` | Пароль суперпользователя PostgreSQL | `openssl rand -base64 32` |
| `REDIS_PASSWORD` | Пароль Redis | `openssl rand -base64 32` |
| `JWT_SECRET` | Секрет для access-токенов | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов (зарезервирован) | `openssl rand -hex 32` |
| `CONTENT_TOKEN_SECRET` | Секрет для защиты материалов Академии | `openssl rand -hex 32` |
| `PASSWORD_ENCRYPTION_KEY` | Ключ Fernet для шифрования паролей в админке | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

### Опциональные

| Переменная | Описание |
|------------|----------|
| `YANDEXGPT_API_KEY` | Ключ API YandexGPT для AI-помощника |
| `YANDEXGPT_FOLDER_ID` | Folder ID Yandex Cloud для YandexGPT |
| `YANDEX_DISK_TOKEN` | OAuth-токен Яндекс.Диска для синхронизации Академии |
| `YANDEX_DISK_PUBLIC_FOLDER` | Публичная папка на Яндекс.Диске с материалами Академии |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота для уведомлений |

> **Важно:** backend валидирует секреты при старте в `NODE_ENV=production`. Если `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CONTENT_TOKEN_SECRET` или `PASSWORD_ENCRYPTION_KEY` пустые или используют дефолтные/слабые значения, приложение упадёт с ошибкой до запуска API.

## Повторный деплой

После обновления кода:

```bash
cd /opt/foxinburg
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Health check

Проверить состояние API можно публичным endpoint'ом:

```bash
curl https://foxinburg.ru/api/v3/health
```

Пример ответа:

```json
{
  "status": "ok",
  "service": "foxinburg-api",
  "version": "3.0.0",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

Также доступен упрощённый `GET /health` для балансировщиков и мониторинга.

## Логи

```bash
sudo docker compose -f docker-compose.prod.yml logs -f
sudo docker compose -f docker-compose.prod.yml logs -f backend
sudo docker compose -f docker-compose.prod.yml logs -f frontend
```
