from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base

# Импорт всех моделей для создания таблиц
from app.models import (
    User, Organization, Branch, Course, Module, Lesson, LessonContent,
    Test, TestQuestion, TestAttempt, Homework, HomeworkReview, Group,
    Enrollment, LessonProgress, Lead, Deal, Payment, Transaction,
    SystemEvent, AuditLog, Notification, Achievement, UserAchievement, File,
)

from app.routers import auth, users, seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы при старте (для разработки)
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

app.include_router(auth.router, prefix="/api/v3")
app.include_router(users.router, prefix="/api/v3")
app.include_router(seed.router, prefix="/api/v3")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "foxinburg-api", "version": "3.0.0"}
