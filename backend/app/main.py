import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from sqlalchemy import text

from app.database import engine, Base
from app.services.redis_client import get_redis

# Импорт всех моделей для создания таблиц
from app.models import (
    User, Organization, Branch, Course, Module, Lesson, LessonContent,
    Test, TestQuestion, TestAttempt, Homework, HomeworkReview, Group,
    EmployeeGroup, Enrollment, LessonProgress, Lead, Deal, Payment, Transaction, Invoice, Expense, Subscription,
    SystemEvent, AuditLog, Notification, Achievement, UserAchievement, File,
    Schedule, Attendance, ChatRoom, ChatParticipant, ChatMessage,
    Task, Directory, StaffLeave, StaffKpi, SystemSettings, ScheduleException,
    Product, CartItem, Order, OrderItem,
)

from app.routers import (
    auth, users, seed, courses, modules, lessons, groups, employee_groups, enrollments,
    leads, deals, finance, homeworks, tests, notifications, achievements,
    files, organizations, progress, analytics, branches, schedules, attendance,
    chats, chat_ws, teacher_academy, knowledge, methodists, system, ai, tasks, directories, reports, surveys, hr,
    role_config, dashboard, max_bot, store,
)
from app.admin import setup_admin


scheduler = AsyncIOScheduler()


async def _scheduled_academy_sync():
    from app.services.unit_of_work import UnitOfWork
    from app.services.teacher_academy_service import TeacherAcademyService

    try:
        async with UnitOfWork() as uow:
            service = TeacherAcademyService(uow)
            await service.sync_from_yandex_disk()
    except Exception:
        import logging

        logging.getLogger(__name__).exception("Scheduled academy sync failed")


async def _scheduled_payroll_run():
    from datetime import date, timedelta
    from app.services.unit_of_work import UnitOfWork
    from app.services.finance_service import FinanceService
    from app.models.user import User
    from sqlalchemy import select

    try:
        today = date.today()
        # предыдущий месяц
        first_current = today.replace(day=1)
        last_prev = first_current - timedelta(days=1)
        first_prev = last_prev.replace(day=1)
        async with UnitOfWork() as uow:
            result = await uow.session.execute(select(User.id).where(User.role == "teacher"))
            teacher_ids = [row[0] for row in result.all()]
            service = FinanceService(uow)
            for teacher_id in teacher_ids:
                try:
                    await service.run_teacher_payroll(teacher_id, first_prev, last_prev)
                except Exception:
                    import logging
                    logging.getLogger(__name__).exception(f"Scheduled payroll failed for teacher {teacher_id}")
            await uow.commit()
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Scheduled payroll run failed")


async def _scheduled_class_reminders():
    from app.services.unit_of_work import UnitOfWork
    from app.services.schedule_reminder_service import ScheduleReminderService

    try:
        async with UnitOfWork() as uow:
            service = ScheduleReminderService(uow)
            counters = await service.process_all_reminders()
            await uow.commit()
            import logging
            logging.getLogger(__name__).info("Class reminders sent: %s", counters)
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Scheduled class reminders failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # В development используем create_all для удобства;
    # в production схема управляется Alembic миграциями.
    if settings.NODE_ENV == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    # Загружаем кастомные роли в кэш
    from app.services.unit_of_work import UnitOfWork
    from app.services.role_config_service import RoleConfigService
    try:
        async with UnitOfWork() as uow:
            await RoleConfigService(uow).load_cache()
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to load role config cache")

    # Автоматическая синхронизация Академии педагогов с Яндекс.Диском
    if settings.YANDEX_DISK_TOKEN and settings.YANDEX_DISK_PUBLIC_FOLDER:
        scheduler.add_job(
            _scheduled_academy_sync,
            "cron",
            hour=2,
            minute=0,
            id="academy_sync",
            replace_existing=True,
        )

    # Автоматическое начисление зарплат преподавателям 1-го числа за прошлый месяц
    scheduler.add_job(
        _scheduled_payroll_run,
        "cron",
        day=1,
        hour=3,
        minute=0,
        id="payroll_run",
        replace_existing=True,
    )

    # Напоминания о предстоящих занятиях (за сутки и за час)
    scheduler.add_job(
        _scheduled_class_reminders,
        "interval",
        minutes=5,
        id="class_reminders",
        replace_existing=True,
    )

    if scheduler.get_jobs():
        scheduler.start()

    yield

    if scheduler.running:
        scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title="FOXINBURG API",
    description="API образовательной платформы FOXINBURG EBOS",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS: в production ограничиваем методы и заголовки, в development оставляем гибкие настройки.
_cors_origins = [settings.FRONTEND_URL]
if settings.NODE_ENV == "development":
    _cors_origins.append("http://localhost:5173")

_cors_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
_cors_headers = ["Authorization", "Content-Type", "X-Requested-With"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=_cors_methods,
    allow_headers=_cors_headers,
)

app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/v3")
app.include_router(users.router, prefix="/api/v3")
app.include_router(seed.router, prefix="/api/v3")
app.include_router(courses.router, prefix="/api/v3")
app.include_router(modules.router, prefix="/api/v3")
app.include_router(lessons.router, prefix="/api/v3")
app.include_router(groups.router, prefix="/api/v3")
app.include_router(employee_groups.router, prefix="/api/v3")
app.include_router(enrollments.router, prefix="/api/v3")
app.include_router(leads.router, prefix="/api/v3")
app.include_router(deals.router, prefix="/api/v3")
app.include_router(finance.router, prefix="/api/v3")
app.include_router(homeworks.router, prefix="/api/v3")
app.include_router(tests.router, prefix="/api/v3")
app.include_router(notifications.router, prefix="/api/v3")
app.include_router(achievements.router, prefix="/api/v3")
app.include_router(files.router, prefix="/api/v3")
app.include_router(organizations.router, prefix="/api/v3")
app.include_router(branches.router, prefix="/api/v3")
app.include_router(progress.router, prefix="/api/v3")
app.include_router(schedules.router, prefix="/api/v3")
app.include_router(attendance.router, prefix="/api/v3")
app.include_router(chats.router, prefix="/api/v3")
app.include_router(chat_ws.router, prefix="/api/v3")
app.include_router(teacher_academy.router, prefix="/api/v3")
app.include_router(knowledge.router, prefix="/api/v3")
app.include_router(methodists.router, prefix="/api/v3")
app.include_router(analytics.router, prefix="/api/v3")
app.include_router(system.router, prefix="/api/v3")
app.include_router(ai.router, prefix="/api/v3")
app.include_router(tasks.router, prefix="/api/v3")
app.include_router(directories.router, prefix="/api/v3")
app.include_router(reports.router, prefix="/api/v3")
app.include_router(surveys.router, prefix="/api/v3")
app.include_router(hr.router, prefix="/api/v3")
app.include_router(role_config.router, prefix="/api/v3")
app.include_router(dashboard.router, prefix="/api/v3")
app.include_router(max_bot.router, prefix="/api/v3")
app.include_router(store.router, prefix="/api/v3")

setup_admin(app)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "foxinburg-api", "version": "3.0.0"}


@app.get("/api/v3/health")
async def api_health_check():
    """Проверка работоспособности API, базы данных и Redis."""
    health = {
        "status": "ok",
        "service": "foxinburg-api",
        "version": "3.0.0",
        "checks": {},
    }

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health["checks"]["database"] = {"status": "ok"}
    except Exception as exc:
        health["checks"]["database"] = {"status": "error", "detail": str(exc)}
        health["status"] = "error"

    try:
        redis = await get_redis()
        await redis.ping()
        health["checks"]["redis"] = {"status": "ok"}
    except Exception as exc:
        health["checks"]["redis"] = {"status": "error", "detail": str(exc)}
        health["status"] = "error"

    return health
