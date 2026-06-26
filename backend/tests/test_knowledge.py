import pytest
import pytest_asyncio
from sqlalchemy import text

from app.core.permissions import Role


pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def cleanup_knowledge_data(db_session, user_factory):
    yield
    await db_session.execute(text("TRUNCATE TABLE knowledge_articles CASCADE"))
    await db_session.commit()


async def test_create_update_delete_article(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)

    create_res = await client.post("/api/v3/knowledge", json={
        "title": "Как проводить вводный урок",
        "content": "Старое содержание",
        "category": "Методика",
        "tags": "урок, адаптация",
        "is_published": True,
    }, headers=methodist)
    assert create_res.status_code == 201
    article = create_res.json()["data"]
    assert article["title"] == "Как проводить вводный урок"
    assert article["category"] == "Методика"

    upd_res = await client.patch(f"/api/v3/knowledge/{article['id']}", json={
        "title": "Новое название",
        "content": "Новое содержание",
        "is_published": False,
    }, headers=methodist)
    assert upd_res.status_code == 200
    updated = upd_res.json()["data"]
    assert updated["title"] == "Новое название"
    assert updated["content"] == "Новое содержание"
    assert updated["is_published"] is False

    del_res = await client.delete(f"/api/v3/knowledge/{article['id']}", headers=methodist)
    assert del_res.status_code == 200


async def test_manager_sees_unpublished_but_student_does_not(client, auth_headers_factory):
    methodist = await auth_headers_factory(Role.METHODIST)
    student = await auth_headers_factory(Role.STUDENT)

    draft_res = await client.post("/api/v3/knowledge", json={
        "title": "Черновик статьи",
        "content": "Не опубликовано",
        "is_published": False,
    }, headers=methodist)
    assert draft_res.status_code == 201
    draft_id = draft_res.json()["data"]["id"]

    # Methodist (management) sees the unpublished draft in the list and by id
    list_mgr = await client.get("/api/v3/knowledge", headers=methodist)
    assert list_mgr.status_code == 200
    mgr_ids = [a["id"] for a in list_mgr.json()["data"]]
    assert draft_id in mgr_ids

    get_mgr = await client.get(f"/api/v3/knowledge/{draft_id}", headers=methodist)
    assert get_mgr.status_code == 200

    # Student does not see unpublished drafts
    list_student = await client.get("/api/v3/knowledge", headers=student)
    assert list_student.status_code == 200
    student_ids = [a["id"] for a in list_student.json()["data"]]
    assert draft_id not in student_ids

    get_student = await client.get(f"/api/v3/knowledge/{draft_id}", headers=student)
    assert get_student.status_code == 404


async def test_student_cannot_create_article(client, auth_headers_factory):
    student = await auth_headers_factory(Role.STUDENT)
    res = await client.post("/api/v3/knowledge", json={
        "title": "Запрещено",
        "content": "Студент не может",
    }, headers=student)
    assert res.status_code == 403
