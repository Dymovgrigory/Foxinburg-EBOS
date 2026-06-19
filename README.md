# FOXINBURG — Образовательная платформа

Современная платформа для онлайн-обучения языкам.

## Структура проекта

```
foxinburg/
├── backend/          # FastAPI + SQLAlchemy + PostgreSQL
├── frontend/         # React + TypeScript + Vite + Tailwind CSS
├── docker-compose.yml # PostgreSQL + Redis для локальной разработки
├── .env.development  # Переменные окружения для разработки
└── requirements.txt  # Python-зависимости
```

## Установленные инструменты

- **Node.js** v24.17.0 + npm + pnpm + yarn
- **VS Code:** с расширениями для Python, React, Tailwind, Git
- **Docker Desktop** — для запуска PostgreSQL и Redis
- **Python 3.13** + виртуальное окружение `.venv`

## Быстрый старт

### 1. Запуск баз данных

```bash
# Запусти Docker Desktop из /Applications, затем:
docker compose up -d
```

### 2. Запуск бэкенда

```bash
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Бэкенд будет доступен на http://localhost:8000

### 3. Запуск фронтенда

```bash
cd frontend
npm run dev
```

Фронтенд будет доступен на http://localhost:5173

## API документация

После запуска бэкенда:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Переменные окружения

Для локальной разработки используй файл `.env.development`.
Для продакшена создай `.env.production` (не коммить в git!)

## Важно

- Приватные ключи и пароли никогда не публикуй в чатах и не коммить в git.
- Перед деплоем на продакшен обязательно смени JWT_SECRET и пароли.
