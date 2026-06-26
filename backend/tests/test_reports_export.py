"""Regression tests for report CSV/PDF export endpoints.

Before the fix, the export handlers accessed ``resp.body["data"]`` on the
``JSONResponse`` returned by each inner report function. ``JSONResponse.body``
is raw bytes, so subscripting it with a string raised
``TypeError: byte indices must be integers`` -> HTTP 500 for every report type
except ``manager`` (which was silently empty due to a stale ``isinstance`` guard).
The export buttons on the admin Reports page were therefore all broken.
"""

import pytest

from app.core.permissions import Role

REPORT_TYPES = [
    "manager",
    "sales",
    "teachers",
    "students_payments",
    "students_subscriptions",
    "contracts",
    "accounts",
    "pnl",
    "payroll",
    "expenses",
    "debtors",
]


@pytest.mark.asyncio
@pytest.mark.parametrize("report_type", REPORT_TYPES)
async def test_export_csv_does_not_500(client, auth_headers_factory, report_type):
    headers = await auth_headers_factory(Role.ADMIN)
    resp = await client.get(f"/api/v3/reports/{report_type}/export.csv", headers=headers)
    assert resp.status_code == 200, resp.text
    assert "text/csv" in resp.headers["content-type"]


@pytest.mark.asyncio
@pytest.mark.parametrize("report_type", REPORT_TYPES)
async def test_export_pdf_does_not_500(client, auth_headers_factory, report_type):
    headers = await auth_headers_factory(Role.ADMIN)
    resp = await client.get(f"/api/v3/reports/{report_type}/export.pdf", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"


@pytest.mark.asyncio
async def test_export_unknown_type_returns_404(client, auth_headers_factory):
    headers = await auth_headers_factory(Role.ADMIN)
    resp = await client.get("/api/v3/reports/does_not_exist/export.csv", headers=headers)
    assert resp.status_code == 404
