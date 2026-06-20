import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base

# Импорт всех моделей для создания таблиц
from app.models import (
    User, Organization, Branch, Course, Module, Lesson, LessonContent,
    Test, TestQuestion, TestAttempt, Homework, HomeworkReview, Group,
    Enrollment, LessonProgress, Lead, Deal, Payment, Transaction,
    SystemEvent, AuditLog, Notification, Achievement, UserAchievement, File,
    Schedule, Attendance, ChatRoom, ChatParticipant, ChatMessage,
)

from app.routers import (
    auth, users, seed, courses, modules, lessons, groups, enrollments,
    leads, deals, finance, homeworks, tests, notifications, achievements,
    files, organizations, progress, analytics, branches, schedules, attendance,
    chats, chat_ws,
)
from app.admin import setup_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # В development используем create_all для удобства;
    # в production схема управляется Alembic миграциями.
    if settings.NODE_ENV == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="FOXINBURG API",
    description="API образовательной платформы FOXINBURG EBOS",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(analytics.router, prefix="/api/v3")

setup_admin(app)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "foxinburg-api", "version": "3.0.0"}
