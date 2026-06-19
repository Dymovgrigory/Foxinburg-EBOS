# AGENTS.md — Правила работы с проектом FOXINBURG EBOS

## О проекте

FOXINBURG EBOS (Educational Business Operating System) — единая цифровая экосистема для языковой школы «Фоксинбург». Объединяет LMS, CRM, ERP, HRM, корпоративный университет, игровую вселенную и AI-экосистему.

## Технический стек

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL, Redis
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Axios
- **Infra:** Docker Compose (локально), Yandex Cloud (продакшн)
- **OS:** macOS (локальная разработка)

## Структура проекта

```
foxinburg/
├── backend/              # FastAPI
├── frontend/             # React + Vite
├── docs/                 # Документация
│   ├── FOXINBURG_PROJECT_BIBLE.md
│   ├── MASTER_PROMPT.md
│   ├── ARCHITECTURE_AUDIT.md
│   ├── ROADMAP.md
│   └── brand/
├── assets/               # Брендовые ассеты
├── docker-compose.yml
└── requirements.txt
```

## Как запускать локально

Требуется 3 терминальные сессии:

```bash
# 1. Базы данных
cd /Users/veronika/foxinburg
docker compose up -d

# 2. Backend
cd /Users/veronika/foxinburg/backend
source ../.venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Frontend
cd /Users/veronika/foxinburg/frontend
npm run dev
```

> Для frontend нужен nvm. Если `npm` не найден:
> ```bash
> export NVM_DIR="$HOME/.nvm"
> [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
> ```

## Ключевые правила

1. **Единая архитектура.** Не создавать дублирующие файлы и модули. Все изменения должны усиливать существующую архитектуру.
2. **Бренд неизменен.** Использовать только цвета из `docs/brand/colors.json` и `frontend/tailwind.config.js`.
3. **Backend — источник истины.** Не использовать `localStorage` для хранения бизнес-данных.
4. **Без заглушек.** Каждая кнопка, форма, ссылка должны работать.
5. **QA после каждого модуля.** Проверить кнопки, ссылки, формы, сохранения, консоль, логи.
6. **Российская инфраструктура.** Не использовать Cloudflare, Google CDN и другие зарубежные сервисы.
7. **Коммиты.** После завершения модуля делать `git commit` с понятным сообщением.

## Полезные ссылки

- Локальный backend: http://localhost:8000
- Локальный frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- Продакшн: https://foxinburg.ru

## Контакты и контекст

- Владелец: Григорий
- Проект: FOXINBURG / Фоксинбург
- Слоган: «Образование, которое вдохновляет»
