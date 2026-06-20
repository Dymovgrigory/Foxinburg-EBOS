from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.security import decode_token
from app.schemas.chat import ChatMessageResponse
from app.services.unit_of_work import UnitOfWork
from app.services.chat_service import ChatService
from app.services.user_service import UserService
from app.services.chat_connection_manager import chat_manager

router = APIRouter(prefix="/ws/chats", tags=["websockets"])


@router.websocket("/{room_id}")
async def chat_websocket(
    websocket: WebSocket,
    room_id: int,
    token: str = Query(...),
):
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    async with UnitOfWork() as uow:
        service = ChatService(uow)
        if not await service.is_participant(room_id, user_id):
            await websocket.close(code=1008)
            return

    await chat_manager.connect(room_id, user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            if not content:
                continue

            async with UnitOfWork() as uow:
                service = ChatService(uow)
                message = await service.send_message(room_id, user_id, content)
                await uow.commit()
                user_service = UserService(uow)
                sender = await user_service.get_by_id(user_id)
                response = ChatMessageResponse(
                    id=message.id,
                    room_id=message.room_id,
                    sender_id=message.sender_id,
                    sender_name=sender.name if sender else None,
                    content=message.content,
                    created_at=message.created_at,
                    updated_at=message.updated_at,
                    is_deleted=message.is_deleted,
                ).model_dump(mode="json")

            await chat_manager.broadcast(room_id, response)
    except WebSocketDisconnect:
        pass
    finally:
        chat_manager.disconnect(room_id, user_id, websocket)
