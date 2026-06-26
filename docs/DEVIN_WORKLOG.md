# 🦊 FOXINBURG EBOS — Рабочий журнал (Devin Worklog)

> **Что это за файл и зачем он нужен.**
> Это «живой» журнал совместной работы над проектом. Сюда непрерывно записывается
> история диалога с командой, принятые решения, выполненные команды, изменения в коде
> и текущее состояние задач.
>
> **Путь к файлу (сохрани его себе):**
> `docs/DEVIN_WORKLOG.md` в репозитории `Dymovgrigory/Foxinburg-EBOS`
> Прямая ссылка: https://github.com/Dymovgrigory/Foxinburg-EBOS/blob/main/docs/DEVIN_WORKLOG.md
>
> Если зайти с другого аккаунта — достаточно открыть этот файл, прочитать раздел
> «Как продолжить работу» и последнюю запись в «Журнале сессий», чтобы продолжить
> работу над проектом без потери контекста.

---

## 📌 Краткое состояние проекта

- **Проект:** FOXINBURG EBOS — единая образовательная экосистема (LMS + CRM + ERP + HRM) для языковой школы «Фоксинбург».
- **Прод:** https://foxinburg.ru — работает. Health: `GET https://foxinburg.ru/api/v3/health`.
- **Стек:** Backend — Python 3.13 / FastAPI / SQLAlchemy 2 (async) / PostgreSQL / Redis. Frontend — React 18 / Vite / TypeScript / Tailwind.
- **Автодеплой:** GitHub Actions `.github/workflows/deploy.yml` → при `push` в `main` по SSH запускает `scripts/update.sh` на сервере (git pull + docker rebuild + alembic upgrade).

## 🚀 Как продолжить работу (для нового аккаунта / новой сессии)

1. Клонировать репозиторий: `git clone https://github.com/Dymovgrigory/Foxinburg-EBOS.git`
2. Прочитать `AGENTS.md` (правила) и этот файл (журнал).
3. Локальный запуск:
   ```bash
   docker compose up -d                      # PostgreSQL + Redis
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env.development          # заполнить значения (см. ниже)
   cd backend && alembic upgrade head && python -m app.seeders.cli   # миграции + тестовые данные
   uvicorn app.main:app --reload --port 8000 # backend → http://localhost:8000
   cd ../frontend && npm install && npm run dev   # frontend → http://localhost:5173
   ```
4. Тестовые логины (после сидирования, локально): `admin@foxinburg.ru`, `teacher@foxinburg.ru`, и т.д.
   Пароль у засеянных пользователей генерируется случайно и пишется в лог backend
   (строка «Сгенерированы тестовые пользователи. Временный пароль: …»).
5. Деплой: просто `git push` в `main` — автодеплой сам выкатит изменения на прод.

> ⚠️ Реальные секреты (`.env.production`, ключи Tinkoff/Yandex/Telegram, SSH) в репозиторий НЕ коммитятся. Они хранятся на сервере и в GitHub Secrets.

---

## 🗂 Журнал сессий

### Правка — страница «Задачи» для Педагога (PR #3)

- `frontend/src/pages/TasksPage.tsx`: у Педагога выпадающие списки «Ответственный» / «Контакт» / фильтры были пустыми, потому что данные грузились через `GET /users` → `403` (ошибка молча игнорировалась). Теперь Педагог получает список через `GET /users/students` (его ученики), остальные роли — через `GET /users`. Педагог снова может назначить задачу.
- Проверено: бэкенд `TaskService.list_tasks` скоупит задачи по `assignee_id == me OR creator_id == me` — Педагог видит только свои задачи (нет утечки чужих). `tsc -b` — без ошибок.

### Сессия 2026-06-26 — Доведение ролей «Педагог» и «Администратор» до идеала

**Запрос команды (Harper / Григорий):**
> Делать коммиты на GitHub самостоятельно, проверять автодеплой, видеть результат на сервере.
> Завести файл-журнал диалога/истории/команд/кода (этот файл).
> Довести роли **Педагог** и **Администратор** до 100% — без ошибок, багов, пустых
> кнопок, пустых ссылок и заглушек. Все разделы, модели, маршруты и связи — рабочие.
> Опираться на лучшие мировые практики LMS/CRM.

**Сделано:**
- Развёрнут проект локально (Postgres+Redis, backend, frontend, миграции, сидирование). Health-check проходит.
- Прогнан `scripts/qa_roles.py` — все ролевые проверки API проходят (baseline OK).
- Проверен автодеплой: последний GitHub Actions run «Deploy to production» — `success`; прод-сайт и API живы.
- Создан этот журнал (`docs/DEVIN_WORKLOG.md`).

**Аудит ролей — PR #2 (доступ к страницам «Курсы» и «Ученики»):**
- `navigation.tsx`: убрана «мёртвая» ссылка `/course-builder` из меню Педагога (роль не имеет доступа по `ROLE_ACCESS` → ссылка вела на редирект).
- `CoursesPage.tsx`: кнопка «Новый курс» и действие пустого состояния теперь показываются только ролям с правом `COURSE_CREATE` (`owner/super_admin/admin/methodist`). Раньше Педагог/гость видели кнопку → `403` при клике.
- `StudentsPage.tsx`: страница «Ученики» теперь грузит данные через `GET /users/students` (работает для teacher/methodist/manager со скоупом), а не через `GET /users` (давал `403` всем кроме admin). Кнопка «Добавить ученика» скрыта для ролей без `USER_CREATE`.
- Backend `users.py`: в `GET /users/students` добавлена роль `manager` (имеет `USER_READ`, видит всех учеников) — иначе менеджер получал `403` на странице «Ученики».
- Backend `schemas/user.py`: в `UserListResponse` добавлено поле `group_id` — колонка «Группа» в списке учеников раньше всегда была пустой.
- Тесты: добавлен `test_manager_can_list_all_students`; прогнаны `test_users*`, `test_rbac_write` — 562 passed. Frontend `tsc -b` — без ошибок.

**В работе / далее:**
- Продолжение аудита остальных страниц Педагога (Группы, Расписание, Задачи, Прогресс, Посещаемость) и затем полного набора страниц Администратора.
- Сверка с мировыми практиками LMS/CRM по функционалу обеих ролей.

<!-- Новые записи добавляются СВЕРХУ внутри этого раздела, с датой и кратким итогом. -->
