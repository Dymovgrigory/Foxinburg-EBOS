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

### Сессия 2026-06-27 — Автопровижининг миров при старте бэкенда ⏳ ожидает мёрджа

**Контекст.** PR #17 (Foxinburg World Фаза A) смёржен в `main`, прод задеплоен и здоров
(`GET /api/v3/health` → 200). Но миры на проде не появляются автоматически: их создаёт
сидер (dev) или ручной `POST /api/v3/world/admin/provision` (нужен owner-токен прода,
которого у агента нет).

**Решение.** Добавил идемпотентный провижининг миров в `lifespan`-хук старта бэкенда
(`backend/app/main.py`): при старте вызываются `ensure_world_courses` + `ensure_world_achievements`
(те же функции, что у админ-эндпоинта). Обёрнуто в `try/except` — ошибка не блокирует старт.
Теперь после деплоя 6 миров A1→C2 и ачивки создаются сами, ручной запрос не нужен.

**Проверено локально.** Перезапуск `uvicorn` → в логах видно, что хук проверил все 6 уровней
и ничего не продублировал (идемпотентно), `Application startup complete`, health 200.
`/world/map` отдаёт ровно 6 миров (A1..C2). `pytest tests/test_world.py` → 6 passed.

**Замечание про процесс.** Платформа Devin блокирует прямой push/мёрдж в `main` на уровне
инструмента (несмотря на заметку владельца «пушить в main»), поэтому изменение идёт отдельным
PR — мёрджит владелец.

---

### Сессия 2026-06-27 — Foxinburg World (Фаза A): подписка, геймификация, карта миров, родительский кабинет, лендинг 4 сегмента ✅ смёржен (PR #17)

**Задача (от владельца).** Для учеников реализовать **Foxinburg World** (а не простые курсы — каталог
откладываем). На лендинге: «попробовать бесплатно» + платная подписка **500 ₽/мес с автопродлением**.
Лендинг разбить на 4 сегмента: (1) ученики/родители → Foxinburg World; (2) владельцы школ → EBOS «всё в
одном»; (3) преподаватели/админы внутри организации → Академия + личный кабинет; (4) самостоятельные
преподаватели/админы → доступ только к Академии. Владелец подтвердил: **берём Фазу A** (без NPC/боссов/AI —
это Фаза B позже). Про рекуррент Tinkoff — «на своё усмотрение».

**Решения по объёму (Фаза A MVP).**
- 6 миров A1→C2 на существующем `Course.type='student_world'` (без дублирования архитектуры):
  A1 🌲 Лес Знакомств (демо), A2 🏙 Город Общения, B1 🏰 Королевство Уверенности, B2 🎓 Академия Мастеров,
  C1 👑 Империя Свободного Английского, C2 🏆 Лига Экспертов.
- Доступ к World по подписке: **триал 7 дней** (открыт демо-мир A1) → **500 ₽/мес** (все миры), `auto_renew=True`.
- Рекуррент: Tinkoff Rebill (автосписание с сохранённой карты). Если рекуррент недоступен — деградирует в
  «продление по ссылке» (статус `past_due` + ручное продление), без поломок.

**Backend (готово, протестировано).**
- Модель `UserSubscription` (`backend/app/models/user_subscription.py`): статусы trialing/active/past_due/
  cancelled/expired, `auto_renew`, `current_period_end`, `customer_key`/`rebill_id` для рекуррента.
- Поля геймификации/стрика у `User`: `xp`, `coins`, `level`, `last_activity_date`.
- Миграция `backend/alembic/versions/a1b2c3d4e5f6_add_foxinburg_world.py` (применена: `alembic current` = head).
- `SubscriptionService` (`services/subscription_service.py`): `get_active_subscription`, `access_level`
  (full/trial/none), `start_trial`, `create_monthly_order`, `activate_from_order`, `cancel`,
  `charge_due_renewals`.
- `WorldContentService` (`services/world_content.py`): идемпотентный провижининг 6 миров + достижений.
- `GamificationService` (`services/gamification_service.py`): на LESSON_COMPLETED/TEST_PASSED/HOMEWORK_REVIEWED
  начисляет XP/coins/level, ведёт Daily Streak, выдаёт достижения.
- Эндпоинты World (`routers/world.py`, префикс `/api/v3/world`): `GET /map`, `GET /subscription`,
  `GET /{course_id}`, `POST /trial`, `POST /subscribe`, `POST /cancel`, `POST /admin/provision`.
- Эндпоинты родителя (`routers/parent.py`): `GET /parent/children`, `GET /parent/children/{id}/dashboard`.
- Tinkoff Rebill (`services/tinkoff_service.py`): `init_payment(recurrent=True)`, `charge_recurrent`, активация в вебхуке.
- Сидер: провижининг миров/достижений + связка родитель→дети (parent@ → student@, student2@).
- Тесты: `backend/tests/test_world.py` (6 тестов, зелёные); общий `pytest -q` → 790 passed (1 давний env-only fail).

**Frontend (готово, проверено в браузере локально).**
- API: `worldApi` (map/subscription/detail/startTrial/subscribe/cancel/provision), `parentApi` (children/childDashboard) + интерфейсы — `frontend/src/api/index.ts`.
- Роуты `/world`, `/world/:id`, `/parent`, `/parent/children/:childId` с `RoleProtected` — `App.tsx`.
- Навигация: пункт «Foxinburg World» (ученикам) и «Кабинет родителя» (родителям) — `config/navigation.tsx`.
- `pages/WorldPage.tsx`: статы (уровень/XP/монеты/серия), баннер подписки (3 состояния none/trial/full),
  карта из 6 миров со статусом блокировки/прогрессом, CTA триал/подписка/отмена.
- `pages/WorldDetailPage.tsx`: детали мира, модули/уроки со статусами, прогресс-бар, переход в плеер урока.
- `pages/ParentDashboardPage.tsx`: список детей / дашборд ребёнка (статы, миры, достижения, посещаемость, финансы).
- `pages/LandingPage.tsx`: переделан в 4 сегмента (см. задачу), World — главный экран; триал + 500 ₽/мес; FAQ.
- `components/AuthModal.tsx`: синхронизация режима вход/регистрация при каждом открытии (модалка на лендинге примонтирована).
- Проверки: `tsc -b` — чисто; ESLint по новым файлам — 0 ошибок (исправлен rules-of-hooks `useReveal` внутри `.map`).

**Проверено вживую (запись прилагается к отчёту).**
- Логин ученика → `/world`: карта 6 миров, A1 «Демо-мир», A2–C2 «Доступно по подписке».
- «Попробовать бесплатно» → активирован триал на 7 дней, баннер «Осталось 7 дн.», A1 разблокирован («Продолжить»).
- ⚠️ Важно: при тестировании оказалось, что **запущенный backend был устаревшим** (стартовал без `--reload`
  и не содержал роуты World → `/world/map` отдавал 404). Перезапустил `uvicorn ... --reload` → роуты появились,
  страница заработала. Вывод для прода: после мёрджа автодеплой пересобирает контейнер, поэтому там роуты подхватятся.

**Тестовые пароли (локально перевыставлены, т.к. сидер генерит случайный):** student@, student2@, parent@,
owner@foxinburg.ru → `Test1234!`. Бэкенд-логин — form-data (`username`/`password`), ответ обёрнут в `{success,message,data}`.

**Состояние и что осталось.**
- Все изменения World закоммичены в ветку (см. последний коммит). Лендинг/страницы World/подписка/родитель — готовы.
- Осталось: дотестировать `/world/:id`, `/parent`, отмену подписки; обновить PR #17 (или открыть новый PR на World);
  дождаться мёрджа владельцем (платформа запрещает агенту пушить/мёржить в `main`).

---

### Сессия 2026-06-27 — Пароль ученика + B2C-каталог с онлайн-оплатой и автозачислением ⏳ ожидает мёрджа

**Задача (от владельца).** (1) Управляющим ролям дать просмотр (расшифровка) и редактирование
пароля входа ученика прямо в карточке. (2) Перевести платформу с B2B (продажа EBOS школам) на
B2C (ученик покупает курс онлайн): публичный каталог курсов с ценами → онлайн-оплата Tinkoff →
автозачисление; переделать лендинг под ученика («что/для кого/как купить»).

**Ветка:** `devin/1782541551-student-password-login` (включает пароль + каталог + лендинг).

**1. Пароль ученика в карточке (backend `users.py` / `user_service.py` / схемы).**
- `GET /users/{id}` отдаёт `plain_password` (Fernet-расшифровка свойства `User.plain_password`)
  **только** при праве `USER_UPDATE` (owner/super_admin/admin). Методист/менеджер пароль не видят.
- `PATCH /users/{id}` принимает новый пароль → bcrypt-хеш (`password_hash`) + Fernet-шифр
  (`encrypted_password`). В аудит-лог пароль не пишется. Тесты в `test_users.py`.

**2. Публичный каталог (новый `routers/catalog.py`, подключён в `main.py` под `/api/v3`).**
- `GET /catalog` — список опубликованных курсов (`status=='published'`), у которых есть активный
  привязанный `Product` (цена/валюта/тип). Без авторизации.
- `GET /catalog/{product_id}` — карточка: цена + вложенный курс с полной программой
  (модули → уроки), `modules_count`, `lessons_count`, `certificate_enabled`.
- Хелперы `_course_public()`, `_product_public()`, `_is_visible()`.

**3. Покупка в один клик + автозачисление (`routers/store.py`).**
- `POST /store/buy/{product_id}` (auth): создаёт `Order` с одним `OrderItem`, инициирует Tinkoff
  (переиспользует `_init_tinkoff_payment()`), возвращает `payment_url`. Если Tinkoff не настроен
  (локально) — заказ создаётся, оплата доступна в личном кабинете (graceful fallback).
- Вебхук Tinkoff: после `order.status='paid'` вызывает `_enroll_paid_courses(uow, order)` →
  для каждого item с `product.target_course_id` дергает `EnrollmentService.enroll_student(...)`
  (создаёт зачисление, прогресс, ДЗ, доступ к чату). `ValueError` (уже зачислен) — пропуск, вебхук
  не падает. Тесты в новом `test_catalog.py` (4 шт.): список/скрытие неопубликованного/детали с
  программой/`buy`→вебхук→автозачисление.

**4. Frontend.**
- Новые публичные страницы (без сайдбара): `CatalogPage.tsx` (`/catalog`, сетка курсов с ценой) и
  `CatalogCoursePage.tsx` (`/catalog/:productId`, программа + «Купить курс»). Гость без сессии →
  `AuthModal` с `redirectTo=/catalog/{id}?buy=1` и авто-покупкой после входа.
- `AuthModal.tsx`: добавлены пропсы `redirectTo`, `defaultRegister`.
- `api/index.ts`: `catalogApi.list/get`, `storeApi.buy`. Типы `CatalogItem`/`CatalogCourse`.
- `LandingPage.tsx`: переделан под B2C — герой «Учитесь языкам онлайн с нуля», метрики
  (100% онлайн / 24/7 / 1 клик / сертификат), блок «избранные курсы» из каталога, шаги
  «выбрал→оплатил→учишься», FAQ по оплате, CTA «Выбрать курс». B2B-форма сохранена, но
  переименована в блок «Школам и партнёрам» (вторичный).

**Проверки.** Backend `pytest -q` → **790 passed**, 1 pre-existing env-only fail
(`test_production_config::test_development_allows_default_secrets`). Frontend `tsc -b` чисто.
`npm run lint` — pre-existing repo-wide ошибки/варнинги (no-explicit-any, rules-of-hooks в
`useReveal`, exhaustive-deps), новых блокеров не добавлено. Браузер (локально): `/catalog`
показывает курс с ценой 9 900 ₽, карточка `/catalog/1` рендерит программу, «Купить курс» создаёт
заказ (тост «Заказ создан»), лендинг открывается с B2C-контентом. Консоль без ошибок.

### Доработка CRUD — База знаний: создание/редактирование/удаление (PR #16) ⏳ ожидает мёрджа

**Задача (от владельца).** Всё, что создаётся, должно просматриваться и редактироваться
управляющими ролями. Аудит выявил последний крупный пробел: **База знаний (KnowledgeBasePage)**
была **только на чтение**, хотя бэкенд уже отдавал полный CRUD (`POST`/`PATCH`/`DELETE /knowledge`,
под правом `Permission.COURSE_UPDATE`).

**Решение (frontend `KnowledgeBasePage.tsx`).** Переписана страница: поверх списка/просмотра
добавлен управляющий CRUD.
- `canManage = ['owner','super_admin','admin','methodist'].includes(role)`.
- Кнопка «Создать статью» + на каждой карточке «Редактировать»/«Удалить» (только для `canManage`).
- Одна форма-модалка (title, category, tags, content, чекбокс `is_published`) для создания и
  редактирования: `editing ? api.patch('/knowledge/{id}') : api.post('/knowledge')`.
- Черновики (`is_published === false`) помечены бейджем «Черновик».

**Решение (backend `routers/knowledge.py`).** Чтобы черновики менеджера не пропадали из его
же выдачи, list/get теперь показывают неопубликованные статьи пользователям с `COURSE_UPDATE`:
```python
query = select(KnowledgeArticle)
if not has_permission(current_user.role, Permission.COURSE_UPDATE):
    query = query.where(KnowledgeArticle.is_published == True)
```
Ученики/обычные пользователи по-прежнему видят только опубликованное (поведение не изменилось).

**Тесты.** Новый `backend/tests/test_knowledge.py`: round-trip create→update→delete (методист);
менеджер видит черновик (list + by id), ученик — нет (404 / отфильтровано); ученик `POST` → 403.
`pytest -q` — 784 passed (1 pre-existing env-only fail в `test_production_config`). `tsc -b` чисто,
eslint чисто (только repo-wide `exhaustive-deps`). Ветка: `devin/1782514370-knowledge-crud`.

### Доработка CRUD — Курсы: редактирование метаданных (PR #15) ⏳ ожидает мёрджа

**Задача.** Курсы создавались и просматривались, но метаданные нельзя было редактировать из
карточки (правка шла только через конструктор модулей). Замкнул CRUD по сущности «Курс».

**Решение (backend).** Сервис `CourseService.update_course` уже поддерживал `short_description`,
`is_sequential`, `certificate_enabled`, но схема `CourseUpdate` и роутер их не пробрасывали.
Расширил схему `CourseUpdate` (title/description/short_description/status/passing_score/
is_sequential/certificate_enabled) и хендлер `PATCH /courses/{id}`.

**Решение (frontend `CoursesPage.tsx`).** На каждой карточке для управляющих ролей кнопка
«Изменить» открывает `CourseEditModal` с предзаполненной формой (название, краткое/полное
описание, статус, проходной балл, флаги последовательного прохождения и сертификата). Тип курса
read-only. Сохранение → `PATCH /courses/{id}` → тост «Курс обновлён» → список обновляется.
RBAC: `owner/super_admin/admin/methodist` (право `COURSE_UPDATE`).

**Тесты.** `pytest -q` — 781 passed (тот же pre-existing env-fail). Добавлен
`test_update_course_metadata`. `tsc -b` чисто. Ветка: `devin/1782513318-courses-edit`.

### Доработка CRUD — Ученики: карточка + редактирование (PR #14) ✅ смёржен, на проде

**Задача (от владельца).** Доработать функционал управляющих ролей: всё, что создаётся
(Ученики, Группы, Сотрудники и т.д.), должно открываться карточкой и редактироваться.

**Аудит сущностных страниц.** Просмотр+редактирование уже есть у: Сотрудники
(EmployeesPage), Группы (GroupsPage), CRM Лиды/Сделки, Филиалы, Опросы, Товары магазина,
Справочники, Задачи. Платежи (PaymentsPage) — только просмотр (это финансовые записи,
ручное редактирование не предусмотрено — корректно). **Главный пробел: Ученики
(StudentsPage)** — была только форма создания и список, без карточки и редактирования.

**Решение (StudentsPage).** Добавлен `StudentModal` по образцу `EmployeeModal`:
- Клик по строке ученика → модалка, данные подгружаются через `usersApi.get(id)`.
- Поля: `name`, `email` (read-only), `phone`, `group_id` (select по группам), `plan`
  (FREE/PREMIUM), `is_active` (активен/неактивен). Read-only статистика: `level`, `xp`,
  `coins`, `balance`, `debt`, `created_at`, `last_login_at`.
- Сохранение через `usersApi.update(id, {...})` (`PATCH /users/{id}`) — роли
  owner/super_admin/admin. Деактивация `usersApi.delete(id)` — owner/super_admin.
  Методист/менеджер видят карточку только на чтение (поля disabled, без кнопок).
- Создание ученика: т.к. `POST /users` игнорирует `group_id`, группа назначается вторым
  шагом — `POST /users` → затем `PATCH /users/{newId} {group_id}`.
- `frontend/src/types/index.ts`: в тип `User` добавлены `balance/debt/xp/coins/level`
  (optional number) под backend-схему `UserResponse`.

**Тесты.**
- `npm run lint` — без новых ошибок (только pre-existing exhaustive-deps warnings, как в
  соседних страницах). `tsc -b` — чисто.
- `pytest -q` — 780 passed, 1 fail (`test_development_allows_default_secrets`) —
  pre-existing, не связан с правкой (падает и на чистом `main`: в окружении задан
  отличный от дефолта `JWT_SECRET`). Backend не менялся.
- Браузер (admin@foxinburg.ru): открыл карточку ученика, отредактировал имя/телефон,
  Save → тост «Ученик обновлён» → список обновился → при повторном открытии изменения
  на месте. Ошибок в консоли нет.

**Деплой.** Прямой push в `main` заблокирован политикой → создан PR #14 (как PR #6–#12).
Автодеплой на прод сработает после мёрджа. Ветка: `devin/1782513028-students-detail-edit`.

**Дальше.** Курсы (CoursesPage) — добавить редактирование метаданных (название, описание,
категория) из карточки. Затем финальный прогон остальных сущностей.

### Правка — экспорт отчётов CSV/PDF (500 на всех типах) + E2E (PR #9) ✅ смёржен, на проде

**Находка (500).** На странице «Отчёты» (`/reports`, Администратор) кнопки **CSV** и **PDF**
падали с `500` для всех 11 типов отчётов (тип «Менеджер» молча отдавал пустой файл).
Причина: обработчики экспорта читали `JSONResponse.body` как `dict` (`resp.body["data"]`),
а `.body` — это сырые UTF-8 байты, не словарь → `TypeError: byte indices must be integers`.

**Решение.**
- `backend/app/routers/reports.py`: добавлен хелпер `_json_data(resp)` (`json.loads(resp.body)`),
  все 11 обращений `resp.body["data"]` в CSV- и PDF-обработчиках заменены на `_json_data(resp).get("data") or []`.
- `backend/tests/test_reports_export.py`: 23 регресс-теста (11 типов × CSV/PDF + путь 404) — все зелёные.

**E2E (admin@foxinburg.ru), 2/2 PASSED:**
- T1: P&L → **PDF** → `report_pnl.pdf` (валидный `%PDF`) скачался, запрос **200** (раньше 500). ✅
- T2: P&L → **CSV** → `report_pnl.csv` с реальными данными (`income_kopecks,1250000`…). ✅
- Регресс: «Продажи» → CSV тоже скачивается — фикс общий. ✅
- Автодеплой: merge-commit PR #9 в `main`, GitHub Actions «Deploy to production» — `success`, `https://foxinburg.ru/api/v3/health` → `status: ok`.

**Аудит остальных страниц Администратора (без находок — правки не требуются):**
- Read-only обход всех admin-эндпоинтов (`scripts/qa_admin_audit.py`): два `403` — оба **by design**
  (`/system/settings` уже закрыт под `SETTINGS_MANAGE` — PR #5; `/system/roles` в UI не используется,
  страница «Роли» грузится через `/system/permissions` → 200).
- Аудит write-операций (`scripts/qa_admin_writes.py`): чисто, ни одного `403`/`500`.
- Фронтенд: компонент-заглушка `PlaceholderPage` нигде не импортируется (нет stub-маршрутов);
  все пункты меню (`navigation.tsx`) ведут на реальные маршруты (`App.tsx`) — мёртвых ссылок нет;
  пустых/no-op обработчиков `onClick`, `TODO`, `alert()`, `href="#"` в страницах не найдено.

### Правка — 500 при создании группы без преподавателя + E2E (PR #7) ✅ смёржен, на проде

**Находка (500).** Админ создаёт группу без выбора преподавателя → `POST /api/v3/groups` → **500**.
Причина: `GroupService.create_group` авто-создаёт чат группы с `created_by_id = teacher_id or 0`.
Когда преподаватель не выбран, `0` — не валидный пользователь → нарушение FK на `chat_rooms.created_by_id`.

**Решение.** Прокинул `created_by_id` (id текущего пользователя) через сервис и роутер; fallback теперь
`teacher_id or created_by_id` (создатель), а не `0`.
- `backend/app/services/group_service.py`: сигнатура `create_group(*, created_by_id: int, **kwargs)`, чат создаётся с `created_by_id=teacher_id or created_by_id`.
- `backend/app/routers/groups.py`: передаёт `current_user.id` в `create_group`.
- `backend/tests/test_groups.py`: регресс-тест `test_create_group_without_teacher_by_admin` (201, `teacher_id is None`). Группа-тесты — 13 passed.

**E2E (admin@foxinburg.ru), 2/2 PASSED:**
- T1: создание группы БЕЗ преподавателя → `POST /groups` = **201** (раньше 500), тост «Группа создана», группа в списке. ✅
- T2 (регресс): создание группы С преподавателем («Анна Соколова») → 201, тост, группа с именем преподавателя. ✅
- Автодеплой: merge-commit `932c8e2` в `main`, `https://foxinburg.ru/api/v3/health` → `status: ok`.

### Правка — RBAC страницы «Сотрудники» для Администратора + E2E (PR #6) ✅ смёржен, на проде

**Находки (RBAC).** На странице «Сотрудники» (`/employees`):
1. Удаление отпусков/KPI требовало права `USER_DELETE` (у админа его нет), хотя создание/редактирование тех же записей требует лишь `USER_UPDATE` → кнопка «Удалить» давала `403`.
2. Кнопка «Деактивировать» (`DELETE /users` → `USER_DELETE`, только owner/super_admin) у админа была «мёртвой».

**Решение.**
- `backend/app/routers/hr.py`: удаление отпусков/KPI выровнено на `USER_UPDATE` (симметрично созданию/правке).
- `frontend/src/pages/EmployeesPage.tsx`: кнопка «Деактивировать» скрыта для ролей без `USER_DELETE` (видна owner/super_admin).
- `backend/tests/test_rbac_write.py`: добавлены проверки.

**E2E (admin@foxinburg.ru / owner), 4/4 PASSED:**
- T1 админ удаляет отпуск → `DELETE /hr/leaves` = 200 (раньше 403). ✅
- T2 админ удаляет KPI → `DELETE /hr/kpis` = 200 (раньше 403). ✅
- T3 у админа нет кнопки «Деактивировать». ✅
- T4 у owner кнопка «Деактивировать» есть (контроль — скрытие по роли). ✅

### Правка — 500 при создании задачи + E2E-тест роли «Педагог» (PR #4)

**Баг (HTTP 500 при создании/обновлении задачи):**
- `backend/app/services/task_service.py`: `create_task()` возвращал задачу с незагруженными связями (`assignee`/`creator`/`contact`), а роутер в `_task_to_dict()` обращался к `task.assignee.name` → async lazy-load вне greenlet → `MissingGreenlet` → 500. Исправлено: `create_task()` теперь возвращает `await self.get_by_id(task.id)` (там `selectinload`), а `update_task()` делает `session.refresh(task, ["assignee","creator","contact"])`.
- Регресс-тесты: `backend/tests/test_tasks_create.py` (3 теста) — создание задачи с/без ответственного и обновление с ответственным; все проходят. Полный прогон бэкенда: 747 passed (1 пред-существующий фейл `test_production_config` из-за переменной окружения `JWT_SECRET`, к правке не относится).

**E2E-тест роли «Педагог» (ручной, через браузер, запись приложена команде):**
- Тест 1 (PR #3): дропдаун «Ответственный» в задачах заполнен реальными учениками (Алексей Попов, Марина Васильева), а не только «Не назначен». ✅
- Тест 2 (PR #4): создание задачи с ответственным → тост «Задача создана», задача появляется со ссылкой на ученика, без 500 (`POST /api/v3/tasks → 201`). ✅
- Тест 3 (PR #2): на странице «Курсы» у Педагога нет кнопки «Новый курс». ✅
- Тест 4 (PR #2): страница «Ученики» грузится у Педагога, колонка «Группа» заполнена (Группа A1), без 403. ✅

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

### ⭐ ТОЧКА ВОЗОБНОВЛЕНИЯ (RESUME HERE) — состояние на 2026-06-26 ~21:00 UTC

**Кто читает этот файл с другого аккаунта — начинай отсюда.** Ниже полное состояние,
чтобы продолжить аудит ролей «Педагог» и «Администратор» без потери контекста.

**Что уже на проде (foxinburg.ru), смёрджено:** PR #2, #3, #4, #5, #6, #7, #9 (фиксы)
и PR #1, #8, #10 (журнал), а также **PR #11** (плавное пустое состояние Академии
педагогов — `/progress`, `/academy`, `/certification`; подавление красных тостов
на 404/400). Все E2E-тесты пройдены, автодеплой подтверждён (`/api/v3/health` = ok).

**Сейчас открыт PR #12 (ЖДЁТ МЁРДЖА владельцем):**
https://github.com/Dymovgrigory/Foxinburg-EBOS/pull/12 — ветка
`devin/1782509164-teacher-conduct-schedule`.
- **Баг:** Педагог отмечает посещаемость, затем `AttendanceModal` вызывал
  `PATCH /schedules/{id}` со `status=completed`, чтобы провести занятие. Но этот
  маршрут требует право `GROUP_MANAGE`, которого у Педагога нет (есть только
  `ATTENDANCE_MANAGE`) → `403`, тост успеха не показывался, хотя посещаемость
  сохранялась. Несоответствие фронтенда и RBAC бэкенда.
- **Фикс:** добавлен узкий эндпоинт `PATCH /schedules/{id}/conduct`, требующий
  `ATTENDANCE_MANAGE` (то же право, что и для посещаемости), который только ставит
  статус `completed`. Общий `PATCH /schedules/{id}` (полное редактирование)
  по-прежнему под `GROUP_MANAGE` — расширения прав нет.
  - `backend/app/routers/schedules.py`: новый `conduct_schedule`.
  - `frontend/src/api/index.ts`: `schedulesApi.conduct(id)`.
  - `frontend/src/components/AttendanceModal.tsx`: вызов `conduct(id)` вместо
    `update(id, {status:'completed'})`.
- **Тесты:** `backend/tests/test_schedule.py::TestConductSchedule` (новый класс) —
  педагог проводит (200 → `completed`), ученик не может (403), нет занятия (404).
  Локально `test_schedule.py` = **15 passed**. Frontend `tsc -b` = чисто.
- **Проверка на живом локальном сервере (API):** педагог `PATCH /schedules/{id}/conduct`
  → **200 `completed`** («Занятие проведено»); старый `PATCH /schedules/{id}` → 403.
  ⚠️ Локальный uvicorn был запущен БЕЗ `--reload`, поэтому новый маршрут не подхватывался —
  перезапущен с `--reload` (порт 8000), маршрут `/conduct` теперь в OpenAPI.

**НЕ доделано по PR #12 (следующие шаги):**
1. E2E в браузере (testing mode уже одобрен пользователем): teacher@foxinburg.ru →
   Расписание → открыть занятие → «Провести» → отметить посещаемость учеников →
   «Сохранить» → проверить: нет 403, тост «Посещаемость сохранена, занятие проведено»,
   статус занятия стал `completed`. Записать видео + аннотации, оставить комментарий в PR #12.
   (Для теста в локальной БД есть группа A1 (teacher_id=5, 2 ученика) и создано занятие
   id=2 на группу 1 — можно использовать; занятие уже могло стать `completed` после API-проверки,
   при необходимости создать новое занятие как owner.)
2. После мёрджа PR #12 — проверить автодеплой (`curl https://foxinburg.ru/api/v3/health`).
3. Дописать в этот журнал закрытие PR #12.

**Дальше по аудиту Педагога (ещё не пройдено детально):** Группы, Расписание (UI),
Посещаемость (UI), Домашние задания, Мои курсы, Библиотека (`/files`), База знаний,
AI-ассистент, Чаты, Настройки. Скрипт `scripts/qa_teacher_pages.py` проверяет, что
read-эндпоинты этих страниц отдают 2xx для педагога (на момент паузы все read = 2xx;
единственный найденный write-баг — посещаемость/conduct, фикс в PR #12).

**Учётки/доступы:** teacher@foxinburg.ru / admin@foxinburg.ru / owner@foxinburg.ru,
пароль у всех `Qwe123!@#`. Логин бэкенда — form-data (`username`/`password`), не JSON.
Локально: backend `http://localhost:8000` (запускать с `--reload`!), frontend
`http://localhost:5173`. Прод: https://foxinburg.ru (автодеплой GitHub Actions при мёрдже в main).

**Важно про процесс:** платформа Devin запрещает прямой push в `main`, поэтому фиксы идут
отдельными PR (владелец жмёт «Merge»). Пользователь подтвердил «можно разными PR».

---

### Аудит роли «Администратор» — PR #5 (страница «Настройки системы»)

**Находка (RBAC-несоответствие).** Пункт меню Администратора «Настройки системы» (`/school-settings`) открывает страницу с 7 вкладками. Вкладки **Платформа / SMTP / SMS / Telegram / Yandex** читают и сохраняют системные настройки через `GET|PATCH /system/settings`, который на бэкенде требует право `SETTINGS_MANAGE` — а оно есть только у `owner` / `super_admin`. У Администратора этого права нет, поэтому:
- при загрузке `GET /system/settings` → `403` (ошибка молча проглатывалась, поля показывали значения по умолчанию);
- при нажатии «Сохранить» на этих вкладках → `403` и тост «Ошибка сохранения» (пустая/неработающая кнопка — нарушение правила «без заглушек»).

**Решение.** Выровнял UI под источник истины (backend RBAC): вкладки системной инфраструктуры (Платформа/SMTP/SMS/Telegram/Yandex) показываются только ролям с `SETTINGS_MANAGE` (`owner`/`super_admin`). Администратор видит рабочие вкладки **Инфо** и **Брендинг** (организация/филиал — право `ORGANIZATION_MANAGE`, у админа есть). Запрос `GET /system/settings` для админа больше не отправляется.

- `frontend/src/pages/SchoolSettingsPage.tsx`: разделены `ORG_TABS` (инфо, брендинг) и `SYSTEM_TABS` (платформа, smtp, sms, telegram, yandex); состав вкладок зависит от `canManageSystem = role ∈ {owner, super_admin}`. `tsc -b` — чисто, новых ошибок ESLint нет.

**Прочие проверки роли Администратора (без правок):**
- Все пункты меню Администратора (`adminGroups`) ведут на реальные маршруты в `App.tsx`; «мёртвых» ссылок нет.
- Все маршруты Администратора присутствуют в матрице `ROLE_ACCESS` с ролью `admin` — недоступных страниц меню нет.
- Эндпоинт `roleConfigApi` (`/system/roles`, требует `SETTINGS_MANAGE`) в UI **не используется** (нет потребителей) — на работу страниц Администратора не влияет. Страница «Role Ecosystem» (`/roles`) грузится через `/system/permissions` (право `ANALYTICS_READ`, у админа есть) → `200 OK`.

**Открытый вопрос команде.** Если по продуктовой модели Администратор должен полностью управлять системными интеграциями (SMTP/SMS/Telegram/Yandex/режим обслуживания), это решается выдачей права `SETTINGS_MANAGE` роли `admin` в `backend/app/core/permissions.py` — могу быстро переключить по подтверждению.

<!-- Новые записи добавляются СВЕРХУ внутри этого раздела, с датой и кратким итогом. -->
