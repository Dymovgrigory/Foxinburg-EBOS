from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.finance import Payment, Transaction, Invoice, Expense
from app.models.user import User
from app.schemas.finance import (
    PaymentCreate, PaymentUpdate, PaymentResponse, TransactionCreate, TransactionResponse,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceGenerateRequest, InvoicePayRequest,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    PayrollRequest, PnLResponse,
)
from app.core.responses import success_response, error_response
from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/finance", tags=["finance"])


# ---------- Payments ----------

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
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    student = await uow.session.get(User, data.student_id)
    if not student:
        return error_response("Ученик не найден", status_code=404)

    payment = Payment(**data.model_dump())
    uow.session.add(payment)

    delta = data.amount if data.type == "income" else -data.amount
    new_balance = (student.balance or 0) + delta
    student.balance = new_balance

    transaction = Transaction(
        user_id=student.id,
        amount=delta,
        type="payment" if data.type == "income" else "refund",
        balance_after=new_balance,
        description=data.description or f"Платёж",
    )
    uow.session.add(transaction)

    # Если платёж привязан к счёту — отмечаем счёт оплаченным
    if data.invoice_id:
        invoice = await service.get_invoice(data.invoice_id)
        if invoice:
            invoice.status = "paid"
            invoice.paid_at = func.now()

    await uow.commit()
    await uow.session.refresh(payment)
    return success_response(
        data=PaymentResponse.model_validate(payment).model_dump(),
        message="Платёж создан",
        status_code=201,
    )


@router.get("/payments/me")
async def list_my_payments(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment)
        .where(Payment.student_id == current_user.id)
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()
    return success_response(
        data=[PaymentResponse.model_validate(p).model_dump() for p in payments],
        message="Мои платежи",
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


# ---------- Transactions ----------

@router.get("/transactions/me")
async def list_my_transactions(
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
    )
    transactions = result.scalars().all()
    return success_response(
        data=[TransactionResponse.model_validate(t).model_dump() for t in transactions],
        message="Мои транзакции",
    )


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


# ---------- Invoices ----------

@router.get("/invoices")
async def list_invoices(
    student_id: Optional[int] = None,
    group_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    invoices = await service.list_invoices(student_id=student_id, group_id=group_id, status=status)
    return success_response(
        data=[InvoiceResponse.model_validate(i).model_dump() for i in invoices],
        message="Список счетов",
    )


@router.post("/invoices")
async def create_invoice(
    data: InvoiceCreate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    invoice = await service.create_invoice(data.model_dump())
    await uow.commit()
    return success_response(
        data=InvoiceResponse.model_validate(invoice).model_dump(),
        message="Счёт создан",
        status_code=201,
    )


@router.post("/invoices/generate")
async def generate_invoices(
    data: InvoiceGenerateRequest,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    invoices = await service.generate_group_invoices(
        group_id=data.group_id,
        period_start=data.period_start,
        period_end=data.period_end,
        due_date=data.due_date,
    )
    await uow.commit()
    return success_response(
        data=[InvoiceResponse.model_validate(i).model_dump() for i in invoices],
        message=f"Сгенерировано счетов: {len(invoices)}",
        status_code=201,
    )


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    invoice = await service.get_invoice(invoice_id)
    if not invoice:
        return error_response("Счёт не найден", status_code=404)
    return success_response(data=InvoiceResponse.model_validate(invoice).model_dump())


@router.patch("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    invoice = await service.get_invoice(invoice_id)
    if not invoice:
        return error_response("Счёт не найден", status_code=404)
    updated = await service.update_invoice(invoice, data.model_dump(exclude_unset=True))
    await uow.commit()
    return success_response(data=InvoiceResponse.model_validate(updated).model_dump(), message="Счёт обновлён")


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    invoice = await service.get_invoice(invoice_id)
    if not invoice:
        return error_response("Счёт не найден", status_code=404)
    await service.delete_invoice(invoice)
    await uow.commit()
    return success_response(message="Счёт удалён")


@router.post("/invoices/{invoice_id}/pay")
async def pay_invoice(
    invoice_id: int,
    data: InvoicePayRequest,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    try:
        payment = await service.pay_invoice(invoice_id, data.amount, data.method, data.description)
        await uow.commit()
        return success_response(
            data=PaymentResponse.model_validate(payment).model_dump(),
            message="Счёт оплачен",
            status_code=201,
        )
    except ValueError as e:
        return error_response(str(e), status_code=400)


@router.get("/debtors")
async def list_debtors(
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    debtors = await service.get_debtors()
    return success_response(data=debtors, message="Должники")


# ---------- Expenses ----------

@router.get("/expenses")
async def list_expenses(
    branch_id: Optional[int] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    expenses = await service.list_expenses(branch_id=branch_id, category=category, date_from=date_from, date_to=date_to)
    return success_response(
        data=[ExpenseResponse.model_validate(e).model_dump() for e in expenses],
        message="Список расходов",
    )


@router.post("/expenses")
async def create_expense(
    data: ExpenseCreate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    expense = await service.create_expense(data.model_dump(), created_by_id=current_user.id)
    await uow.commit()
    return success_response(
        data=ExpenseResponse.model_validate(expense).model_dump(),
        message="Расход добавлен",
        status_code=201,
    )


@router.get("/expenses/{expense_id}")
async def get_expense(
    expense_id: int,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    expense = await service.get_expense(expense_id)
    if not expense:
        return error_response("Расход не найден", status_code=404)
    return success_response(data=ExpenseResponse.model_validate(expense).model_dump())


@router.patch("/expenses/{expense_id}")
async def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    expense = await service.get_expense(expense_id)
    if not expense:
        return error_response("Расход не найден", status_code=404)
    updated = await service.update_expense(expense, data.model_dump(exclude_unset=True))
    await uow.commit()
    return success_response(data=ExpenseResponse.model_validate(updated).model_dump(), message="Расход обновлён")


@router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    expense = await service.get_expense(expense_id)
    if not expense:
        return error_response("Расход не найден", status_code=404)
    await service.delete_expense(expense)
    await uow.commit()
    return success_response(message="Расход удалён")


# ---------- Payroll ----------

@router.get("/payroll")
async def teacher_payroll(
    teacher_id: int,
    from_date: date,
    to_date: date,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    try:
        result = await service.calculate_teacher_payroll(teacher_id, from_date, to_date)
        return success_response(data=result, message="Расчёт зарплаты")
    except ValueError as e:
        return error_response(str(e), status_code=400)


# ---------- P&L ----------

@router.get("/pnl")
async def pnl_report(
    from_date: date,
    to_date: date,
    branch_id: Optional[int] = None,
    current_user=Depends(require_permission(Permission.FINANCE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = FinanceService(uow)
    result = await service.pnl(from_date, to_date, branch_id)
    return success_response(data=PnLResponse.model_validate(result).model_dump(), message="P&L")
