import os
from datetime import date
from io import BytesIO
from typing import List, Optional

from fpdf import FPDF

from app.models.finance import Invoice, Payment
from app.models.group import Group
from app.models.user import User


def _format_money(kopecks: int) -> str:
    return f"{kopecks / 100:,.2f} руб.".replace(",", " ")


class _FoxPDF(FPDF):
    def __init__(self) -> None:
        super().__init__()
        fonts_dir = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "fonts")
        regular = os.path.join(fonts_dir, "LiberationSans-Regular.ttf")
        bold = os.path.join(fonts_dir, "LiberationSans-Bold.ttf")
        self.add_font("Liberation", "", regular, uni=True)
        self.add_font("Liberation", "B", bold, uni=True)
        self.set_auto_page_break(auto=True, margin=15)

    def header(self) -> None:
        self.set_font("Liberation", "B", 14)
        self.set_text_color(58, 41, 83)
        self.cell(0, 10, "FOXINBURG", ln=True, align="L")
        self.set_font("Liberation", "", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, "«Образование, которое вдохновляет»", ln=True, align="L")
        self.ln(4)
        self.set_draw_color(245, 237, 117)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Liberation", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Страница {self.page_no()}", align="C")


def _draw_kvita(pdf: _FoxPDF, label: str, value: str) -> None:
    pdf.set_font("Liberation", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(55, 7, label, ln=0)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 7, value, ln=1)


def generate_invoice_pdf(
    invoice: Invoice,
    student: Optional[User] = None,
    group: Optional[Group] = None,
) -> bytes:
    pdf = _FoxPDF()
    pdf.add_page()
    pdf.set_font("Liberation", "B", 16)
    pdf.set_text_color(58, 41, 83)
    pdf.cell(0, 10, "Счёт на оплату", ln=True, align="C")
    pdf.ln(4)

    pdf.set_font("Liberation", "B", 12)
    pdf.cell(0, 8, f"Счёт № {invoice.id}", ln=True, align="C")
    pdf.ln(6)

    _draw_kvita(pdf, "Ученик:", student.name if student else f"ID {invoice.student_id}")
    _draw_kvita(pdf, "Группа / курс:", group.name if group else (f"ID {invoice.group_id}" if invoice.group_id else "—"))
    _draw_kvita(pdf, "Период оплаты:", f"{invoice.period_start or '—'} – {invoice.period_end or '—'}")
    _draw_kvita(pdf, "Оплатить до:", str(invoice.due_date) if invoice.due_date else "—")
    _draw_kvita(pdf, "Статус:", _invoice_status_label(invoice.status))
    _draw_kvita(pdf, "Дата выставления:", invoice.created_at.strftime("%d.%m.%Y") if invoice.created_at else "—")
    pdf.ln(6)

    # Table
    pdf.set_fill_color(245, 237, 117)
    pdf.set_font("Liberation", "B", 10)
    pdf.set_text_color(58, 41, 83)
    pdf.cell(130, 9, "Наименование", border=1, fill=True)
    pdf.cell(50, 9, "Сумма", border=1, fill=True, align="R")
    pdf.ln()

    pdf.set_font("Liberation", "", 10)
    pdf.set_text_color(30, 30, 30)
    description = invoice.description or "Оплата обучения"
    pdf.cell(130, 9, description, border=1)
    pdf.cell(50, 9, _format_money(invoice.amount), border=1, align="R")
    pdf.ln()

    pdf.set_font("Liberation", "B", 11)
    pdf.cell(130, 10, "ИТОГО:", border=0, align="R")
    pdf.set_text_color(58, 41, 83)
    pdf.cell(50, 10, _format_money(invoice.amount), border=0, align="R")
    pdf.ln(12)

    pdf.set_font("Liberation", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 5, "Благодарим за своевременную оплату. По всем вопросам обращайтесь в администрацию школы.")

    stream = BytesIO()
    pdf.output(stream)
    return stream.getvalue()


def generate_payment_act_pdf(payment: Payment, student: Optional[User] = None) -> bytes:
    pdf = _FoxPDF()
    pdf.add_page()
    pdf.set_font("Liberation", "B", 16)
    pdf.set_text_color(58, 41, 83)
    pdf.cell(0, 10, "Акт об оплате", ln=True, align="C")
    pdf.ln(4)

    pdf.set_font("Liberation", "B", 12)
    pdf.cell(0, 8, f"Акт № {payment.id}", ln=True, align="C")
    pdf.ln(6)

    _draw_kvita(pdf, "Ученик:", student.name if student else f"ID {payment.student_id}")
    _draw_kvita(pdf, "Дата платежа:", payment.created_at.strftime("%d.%m.%Y %H:%M") if payment.created_at else "—")
    _draw_kvita(pdf, "Способ оплаты:", payment.method or "—")
    _draw_kvita(pdf, "Тип:", "Доход" if payment.type == "income" else "Возврат")
    _draw_kvita(pdf, "Статус:", payment.status or "—")
    if payment.period_start and payment.period_end:
        _draw_kvita(pdf, "Период:", f"{payment.period_start} – {payment.period_end}")
    pdf.ln(6)

    pdf.set_fill_color(245, 237, 117)
    pdf.set_font("Liberation", "B", 10)
    pdf.set_text_color(58, 41, 83)
    pdf.cell(130, 9, "Наименование", border=1, fill=True)
    pdf.cell(50, 9, "Сумма", border=1, fill=True, align="R")
    pdf.ln()

    pdf.set_font("Liberation", "", 10)
    pdf.set_text_color(30, 30, 30)
    description = payment.description or "Оплата за обучение"
    pdf.cell(130, 9, description, border=1)
    pdf.cell(50, 9, _format_money(payment.amount), border=1, align="R")
    pdf.ln()

    pdf.set_font("Liberation", "B", 11)
    pdf.cell(130, 10, "ИТОГО:", border=0, align="R")
    pdf.set_text_color(58, 41, 83)
    pdf.cell(50, 10, _format_money(payment.amount), border=0, align="R")
    pdf.ln(12)

    pdf.set_font("Liberation", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 5, "Настоящий акт подтверждает факт зачисления денежных средств.")

    stream = BytesIO()
    pdf.output(stream)
    return stream.getvalue()


def _invoice_status_label(status: Optional[str]) -> str:
    labels = {
        "draft": "Черновик",
        "sent": "Выставлен",
        "paid": "Оплачен",
        "cancelled": "Отменён",
        "overdue": "Просрочен",
    }
    return labels.get(status or "", status or "—")


def generate_report_pdf(title: str, headers: List[str], rows: List[List[str]]) -> bytes:
    pdf = _FoxPDF()
    pdf.add_page()
    pdf.set_font("Liberation", "B", 16)
    pdf.set_text_color(58, 41, 83)
    pdf.cell(0, 10, title, ln=True, align="C")
    pdf.ln(6)

    if not rows:
        pdf.set_font("Liberation", "", 11)
        pdf.cell(0, 10, "Нет данных", ln=True, align="C")
        stream = BytesIO()
        pdf.output(stream)
        return stream.getvalue()

    col_width = 190 / max(len(headers), 1)
    pdf.set_fill_color(245, 237, 117)
    pdf.set_font("Liberation", "B", 9)
    pdf.set_text_color(58, 41, 83)
    for h in headers:
        pdf.cell(col_width, 8, str(h), border=1, fill=True)
    pdf.ln()

    pdf.set_font("Liberation", "", 8)
    pdf.set_text_color(30, 30, 30)
    for row in rows:
        for cell in row:
            text = str(cell) if cell is not None else ""
            # truncate long cells to avoid overflow
            display = text[:30] + "..." if len(text) > 33 else text
            pdf.cell(col_width, 7, display, border=1)
        pdf.ln()

    stream = BytesIO()
    pdf.output(stream)
    return stream.getvalue()
