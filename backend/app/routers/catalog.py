"""Публичный каталог курсов для лендинга (без авторизации).

Источник истины — товары магазина (`Product`) с типом course/subscription.
Карточка обогащается данными привязанного курса (обложка, программа).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, asc
from sqlalchemy.orm import selectinload

from app.core.responses import success_response, error_response
from app.models.store import Product
from app.models.course import Course, Module
from app.services.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/catalog", tags=["catalog"])

PURCHASABLE_TYPES = ("course", "subscription")


def _course_public(course: Course | None, *, with_program: bool = False) -> dict | None:
    if not course:
        return None
    modules = [m for m in course.modules if getattr(m, "is_active", True)]
    lessons_total = sum(len([l for l in m.lessons if getattr(l, "is_active", True)]) for m in modules)
    data: dict = {
        "id": course.id,
        "title": course.title,
        "short_description": course.short_description,
        "description": course.description,
        "cover_url": course.cover_url,
        "modules_count": len(modules),
        "lessons_count": lessons_total,
        "certificate_enabled": course.certificate_enabled,
    }
    if with_program:
        data["program"] = [
            {
                "title": m.title,
                "description": m.description,
                "lessons": [l.title for l in m.lessons if getattr(l, "is_active", True)],
            }
            for m in sorted(modules, key=lambda m: m.order_index)
        ]
    return data


def _product_public(product: Product, course: Course | None, *, with_program: bool = False) -> dict:
    return {
        "product_id": product.id,
        "title": product.title,
        "description": product.description,
        "image_url": product.image_url,
        "price": product.price,
        "currency": product.currency,
        "product_type": product.product_type,
        "subscription_months": product.subscription_months,
        "lessons_count": product.lessons_count,
        "course_id": product.target_course_id,
        "course": _course_public(course, with_program=with_program),
    }


def _is_visible(product: Product, course: Course | None) -> bool:
    """Курс-товар показываем только если связанный курс опубликован."""
    if product.product_type == "course":
        return bool(course and course.status == "published")
    return True


@router.get("")
async def list_catalog(uow: UnitOfWork = Depends(get_uow)):
    result = await uow.session.execute(
        select(Product)
        .where(Product.is_active == True, Product.product_type.in_(PURCHASABLE_TYPES))  # noqa: E712
        .options(
            selectinload(Product.target_course).selectinload(Course.modules).selectinload(Module.lessons)
        )
        .order_by(asc(Product.sort_order), asc(Product.title))
    )
    products = result.scalars().all()
    items = [
        _product_public(p, p.target_course)
        for p in products
        if _is_visible(p, p.target_course)
    ]
    return success_response(
        data=items,
        message="Каталог курсов",
        meta={"total": len(items)},
    )


@router.get("/{product_id}")
async def get_catalog_item(product_id: int, uow: UnitOfWork = Depends(get_uow)):
    result = await uow.session.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.target_course).selectinload(Course.modules).selectinload(Module.lessons)
        )
    )
    product = result.scalar_one_or_none()
    if (
        not product
        or not product.is_active
        or product.product_type not in PURCHASABLE_TYPES
        or not _is_visible(product, product.target_course)
    ):
        return error_response("Курс не найден", status_code=404)
    return success_response(
        data=_product_public(product, product.target_course, with_program=True),
        message="Карточка курса",
    )
