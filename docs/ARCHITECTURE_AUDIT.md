# 🔍 FOXINBURG EBOS — Architecture Audit

**Дата:** 2026-06-19  
**Проект:** `/Users/veronika/foxinburg`  
**Статус:** Локальная разработка, базовая структура

---

## 1. Текущая структура проекта

```
foxinburg/
├── backend/                 # FastAPI (Python 3.13)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py        # pydantic-settings, .env.development
│   │   ├── database.py      # SQLAlchemy async + asyncpg
│   │   ├── main.py          # FastAPI app, lifespan, CORS
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── user.py      # Модель User
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py      # /login, /register, /me
│   │       └── users.py     # /users/
│   └── migrations/          # Alembic (пусто)
├── frontend/                # React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx          # Маршрутизация
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   ├── index.css        # Tailwind directives
│   │   ├── main.tsx         # React entry
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   └── LoginPage.tsx
│   │   └── services/
│   │       └── api.ts       # Axios client
│   ├── tailwind.config.js   # Цвета fox-purple, fox-gold
│   └── package.json
├── docker-compose.yml       # PostgreSQL + Redis
├── requirements.txt         # Python deps
└── docs/                    # Документация (создана)
```

---

## 2. Backend — что есть

### 2.1 Модели данных

**User:**
```python
id: int PK
email: str unique
name: str
password_hash: str
role: str default="student"
plan: str default="FREE"
target_language: str default="en"
created_at: datetime
updated_at: datetime
```

**Проблемы:**
- Нет отдельной таблицы ролей и прав
- Нет связей с организацией/филиалом
- Нет статуса пользователя (active/blocked)
- Нет аудита действий

### 2.2 API endpoints

- `POST /api/v3/auth/register`
- `POST /api/v3/auth/login`
- `GET /api/v3/auth/me`
- `GET /api/v3/users/`
- `GET /health`

**Проблемы:**
- Регистрация принимает `dict`, а не Pydantic схему
- Нет валидации ролей
- Нет обработки ошибок в едином формате
- `/users/` возвращает dict с ошибкой вместо HTTPException

### 2.3 Безопасность

- JWT с секретом из `.env.development`
- `get_current_user` проверяет токен
- Нет middleware для проверки прав
- Нет rate limiting
- Нет audit log

### 2.4 Зависимости

Все основные зависимости установлены:
- fastapi, uvicorn, sqlalchemy, asyncpg, alembic
- redis, pyjwt, passlib, bcrypt, python-multipart
- pydantic, pydantic-settings, python-dotenv
- greenlet (добавлен вручную)

---

## 3. Frontend — что есть

### 3.1 Страницы

- `/` — HomePage (лендинг)
- `/login` — LoginPage (вход/регистрация)
- `/dashboard` — DashboardPage (личный кабинет)

### 3.2 Состояние авторизации

- Хранение токена в `localStorage`
- Проверка токена при загрузке DashboardPage
- Запрос `/auth/me` для получения пользователя

**Проблемы:**
- Нет глобального контекста авторизации
- localStorage используется как источник истины (нарушает Bible)
- Нет ролевой маршрутизации
- Нет sidebar/burger меню

### 3.3 Стили

Tailwind config:
```js
colors: {
  fox: {
    purple: '#3D2B5E',
    gold: '#F9E4A6',
    light: '#FAF8FD',
    border: '#F0E6FA',
  }
}
```

**Проблемы:**
- Цвета НЕ совпадают с официальным брендбуком:
  - Бренд: `#3A2953` / `#F5ED75`
  - Текущий: `#3D2B5E` / `#F9E4A6`
- Нет CSS-переменных
- Нет типографики
- Нет UI-kit компонентов

### 3.4 API клиент

- Axios с `baseURL: '/api/v3'`
- Интерсептор добавляет Bearer token из localStorage

**Проблемы:**
- Нет единой обработки ошибок
- Нет refresh token
- Нет retry логики

---

## 4. Инфраструктура

### 4.1 Локальная разработка

- PostgreSQL: `localhost:5432` ✅
- Redis: `localhost:6379` ✅
- Backend: `localhost:8000` ✅
- Frontend: `localhost:5173` ✅

### 4.2 Продакшн

- Сервер: Yandex Cloud (89.169.132.104)
- DNS: Яндекс Облако
- SSL: Let's Encrypt
- Nginx проксирует `/api/v3/` на backend `:3000`

---

## 5. Чего не хватает для EBOS

### 5.1 Backend

- [ ] Модели: Organization, Branch, Course, Module, Lesson, Group, Enrollment, Homework, Lead, Deal, Payment, Event, Notification, Achievement
- [ ] Система ролей и прав (RBAC)
- [ ] Event-driven architecture
- [ ] Workflow engine
- [ ] Сервис уведомлений
- [ ] Геймификация
- [ ] Seeders с тестовыми данными
- [ ] Alembic миграции
- [ ] Единый формат ответов API
- [ ] Обработка ошибок

### 5.2 Frontend

- [ ] UI-kit (Button, Card, Input, Modal, Sidebar, etc.)
- [ ] Глобальный AuthContext
- [ ] Ролевая маршрутизация
- [ ] Sidebar с бургером
- [ ] Страницы по ролям (owner, admin, methodist, teacher, student, parent, manager)
- [ ] Дашборды для каждой роли
- [ ] Страница курсов и уроков
- [ ] Страница проверки ДЗ
- [ ] Админ-панель

### 5.3 Интеграции

- [ ] Яндекс Диск
- [ ] Яндекс GPT
- [ ] Telegram
- [ ] Zoom
- [ ] Wazzup / VK / SMS / Email

---

## 6. Ближайшие приоритеты

1. **Исправить брендовые цвета в Tailwind** — критично, стили не должны меняться
2. **Добавить систему ролей и RBAC** — фундамент для всех ролей
3. **Создать AuthContext на frontend** — уйти от localStorage как источника истины
4. **Создать UI-kit** — Button, Card, Input, Sidebar
5. **Реализовать Teacher Academy** — курсы, уроки, тесты, ДЗ, проверка
6. **Создать seeders** — тестовые данные для всех ролей
7. **Добавить админ-панель** — управление пользователями и системой

---

## 7. Рекомендации

1. **Не расширять структуру backend ad-hoc.** Создать все основные модели сразу, чтобы избежать дублирования.
2. **Все endpoints возвращать единый формат:** `{ success: bool, data: any, error: string | null }`.
3. **Frontend:** создать `features/` для каждого модуля, а не класть всё в `pages/`.
4. **Все формы:** валидация на frontend и backend.
5. **После каждого модуля:** QA — проверить каждую кнопку и сохранение.
