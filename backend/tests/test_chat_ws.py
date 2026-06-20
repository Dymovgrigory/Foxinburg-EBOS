"""Тесты WebSocket чатов."""

import os
import subprocess
import sys
import time

import pytest
from websockets.asyncio.client import connect
import websockets

from app.core.security import create_access_token
from app.core.permissions import Role


@pytest.fixture(scope="module")
def running_server():
    """Запускает dev-сервер на отдельном порту для WebSocket-тестов."""
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+asyncpg://foxinburg:foxinburg_dev_pass@localhost:5432/foxinburg_test"
    env["REDIS_URL"] = "redis://:foxinburg_redis_pass@localhost:6379"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=os.path.join(os.path.dirname(__file__), ".."),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Ждём запуска
    for _ in range(30):
        if proc.poll() is not None:
            print("[fixture] server exited early", proc.returncode)
            break
        try:
            import socket
            with socket.create_connection(("127.0.0.1", 8001), timeout=1):
                print("[fixture] server ready")
                break
        except OSError:
            time.sleep(0.2)
    else:
        print("[fixture] server did not become ready")
    yield "ws://127.0.0.1:8001"
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


class TestChatWebSocket:
    async def test_websocket_refuses_without_token(self, running_server):
        with pytest.raises(websockets.InvalidStatus):
            async with connect(f"{running_server}/api/v3/ws/chats/1", open_timeout=5, close_timeout=5):
                pass

    async def test_websocket_refuses_non_participant(self, running_server, auth_headers_factory):
        headers = await auth_headers_factory(Role.STUDENT)
        token = headers["Authorization"].split(" ")[1]
        with pytest.raises(websockets.InvalidStatus):
            async with connect(f"{running_server}/api/v3/ws/chats/1?token={token}", open_timeout=5, close_timeout=5):
                pass

    async def test_websocket_message_exchange(self, running_server, client, auth_headers_factory, user_factory):
        admin_headers = await auth_headers_factory(Role.ADMIN)
        student = await user_factory(Role.STUDENT, "ws_student@test.local")

        response = await client.post(
            "/api/v3/chats",
            json={"name": "WS Chat", "participant_ids": [student.id]},
            headers=admin_headers,
        )
        room_id = response.json()["data"]["id"]

        admin_token = admin_headers["Authorization"].split(" ")[1]
        student_token = create_access_token({"user_id": student.id, "role": "student"})

        admin_ws = await connect(f"{running_server}/api/v3/ws/chats/{room_id}?token={admin_token}", open_timeout=5, close_timeout=5)
        student_ws = await connect(f"{running_server}/api/v3/ws/chats/{room_id}?token={student_token}", open_timeout=5, close_timeout=5)

        await admin_ws.send('{"content": "Hello from admin"}')
        echo = await admin_ws.recv()
        assert "Hello from admin" in echo
        msg = await student_ws.recv()
        assert "Hello from admin" in msg

        await student_ws.send('{"content": "Hi admin"}')
        echo = await student_ws.recv()
        assert "Hi admin" in echo
        msg = await admin_ws.recv()
        assert "Hi admin" in msg

        await admin_ws.close()
        await student_ws.close()
