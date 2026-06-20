from fastapi import FastAPI
from sqladmin import Admin

from app.admin.auth import JWTAdminAuth
from app.admin.views import admin_views
from app.config import settings
from app.database import engine


def setup_admin(app: FastAPI) -> Admin:
    auth_backend = JWTAdminAuth(secret_key=settings.JWT_SECRET)
    admin = Admin(app, engine, authentication_backend=auth_backend)
    for view in admin_views:
        admin.add_view(view)
    return admin
