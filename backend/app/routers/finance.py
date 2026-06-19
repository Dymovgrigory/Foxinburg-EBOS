from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.finance import Payment, Transaction
from app.models.user import User
from app.schemas.finance import PaymentCreate, PaymentUpdate, PaymentResponse, TransactionCreate, TransactionResponse
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/payments")
async def list_payments(
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).order_by(Payment.created_at.desc()))
    payments = result.scalars().all()
    return success_response(
        data=[PaymentResponse.model_validate(p).model_dump() for p in payments],
        message="Список платежей",
    )


@router.post("/payments")
async def create_payment(
    data: PaymentCreate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(User, data.student_id)
    if not student:
        return error_response("Ученик не найден", status_code=404)

    payment = Payment(**data.model_dump())
    db.add(payment)

    delta = data.amount if data.type == "income" else -data.amount
    new_balance = (student.balance or 0) + delta
    student.balance = new_balance

    transaction = Transaction(
        user_id=student.id,
        amount=delta,
        type="payment" if data.type == "income" else "refund",
        balance_after=new_balance,
        description=data.description or f"Платёж #{payment.id}",
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(payment)
    return success_response(
        data=PaymentResponse.model_validate(payment).model_dump(),
        message="Платёж создан",
        status_code=201,
    )


@router.get("/payments/{payment_id}")
async def get_payment(
    payment_id: int,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        return error_response("Платёж не найден", status_code=404)
    return success_response(data=PaymentResponse.model_validate(payment).model_dump())


@router.patch("/payments/{payment_id}")
async def update_payment(
    payment_id: int,
    data: PaymentUpdate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        return error_response("Платёж не найден", status_code=404)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)
    await db.commit()
    await db.refresh(payment)
    return success_response(data=PaymentResponse.model_validate(payment).model_dump(), message="Платёж обновлён")


@router.delete("/payments/{payment_id}")
async def delete_payment(
    payment_id: int,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        return error_response("Платёж не найден", status_code=404)
    await db.delete(payment)
    await db.commit()
    return success_response(message="Платёж удалён")


@router.get("/transactions")
async def list_transactions(
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Transaction).order_by(Transaction.created_at.desc()))
    transactions = result.scalars().all()
    return success_response(
        data=[TransactionResponse.model_validate(t).model_dump() for t in transactions],
        message="Список транзакций",
    )


@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, data.user_id)
    if not user:
        return error_response("Пользователь не найден", status_code=404)
    transaction = Transaction(**data.model_dump())
    user.balance = data.balance_after
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return success_response(
        data=TransactionResponse.model_validate(transaction).model_dump(),
        message="Транзакция создана",
        status_code=201,
    )


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.sum(Payment.amount).label("total")).where(
            Payment.student_id == current_user.id,
            Payment.status == "completed",
        )
    )
    total = result.scalar() or 0
    return success_response(
        data={"balance": current_user.balance, "total_paid": total},
        message="Баланс пользователя",
    )
