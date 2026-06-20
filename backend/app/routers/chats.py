from typing import Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query

from app.core.dependencies import require_permission, require_active_user
from app.core.permissions import Permission
from app.core.responses import success_response, error_response
from app.core.security import decode_token
from app.schemas.chat import (
    ChatRoomCreate,
    ChatRoomResponse,
    ChatRoomListResponse,
    ChatMessageCreate,
    ChatMessageUpdate,
    ChatMessageResponse,
    ChatParticipantResponse,
)
from app.services.unit_of_work import UnitOfWork, get_uow
from app.services.chat_service import ChatService
from app.services.user_service import UserService
router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("")
async def list_chats(
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    rooms = await service.get_user_rooms(current_user.id)
    return success_response(
        data=[ChatRoomListResponse.model_validate(r).model_dump() for r in rooms],
        message="Список чатов",
    )


@router.post("")
async def create_chat(
    data: ChatRoomCreate,
    current_user=Depends(require_permission(Permission.MESSAGE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    room = await service.create_room(
        name=data.name,
        created_by_id=current_user.id,
        group_id=data.group_id,
        participant_ids=data.participant_ids or [],
    )
    await uow.commit()
    return success_response(
        data=ChatRoomResponse.model_validate(room).model_dump(),
        message="Чат создан",
        status_code=201,
    )


@router.get("/{room_id}")
async def get_chat(
    room_id: int,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    if not await service.is_participant(room_id, current_user.id):
        return error_response("Доступ запрещён", status_code=403)
    room = await service.get_room(room_id)
    if not room:
        return error_response("Чат не найден", status_code=404)
    participants = await service.get_participants(room_id)
    user_service = UserService(uow)
    participant_responses = []
    for p in participants:
        user = await user_service.get_by_id(p.user_id)
        participant_responses.append(
            ChatParticipantResponse(
                id=p.id,
                user_id=p.user_id,
                user_name=user.name if user else None,
                role=p.role,
                joined_at=p.joined_at,
            )
        )
    data = ChatRoomResponse.model_validate(room).model_dump()
    data["participants"] = [p.model_dump() for p in participant_responses]
    return success_response(data=data, message="Информация о чате")


@router.get("/{room_id}/messages")
async def list_messages(
    room_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    if not await service.is_participant(room_id, current_user.id):
        return error_response("Доступ запрещён", status_code=403)
    messages = await service.get_messages(room_id, limit=limit, offset=offset)
    user_service = UserService(uow)
    responses = []
    for m in messages:
        sender = await user_service.get_by_id(m.sender_id)
        responses.append(
            ChatMessageResponse(
                id=m.id,
                room_id=m.room_id,
                sender_id=m.sender_id,
                sender_name=sender.name if sender else None,
                content=m.content,
                created_at=m.created_at,
                updated_at=m.updated_at,
                is_deleted=m.is_deleted,
            )
        )
    return success_response(
        data=[m.model_dump() for m in responses],
        message="История сообщений",
    )


@router.post("/{room_id}/messages")
async def send_message(
    room_id: int,
    data: ChatMessageCreate,
    current_user=Depends(require_permission(Permission.MESSAGE_SEND)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    if not await service.is_participant(room_id, current_user.id):
        return error_response("Доступ запрещён", status_code=403)
    message = await service.send_message(room_id, current_user.id, data.content)
    await uow.commit()
    return success_response(
        data=ChatMessageResponse.model_validate(message).model_dump(),
        message="Сообщение отправлено",
        status_code=201,
    )


@router.patch("/{room_id}/messages/{message_id}")
async def edit_message(
    room_id: int,
    message_id: int,
    data: ChatMessageUpdate,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    if not await service.is_participant(room_id, current_user.id):
        return error_response("Доступ запрещён", status_code=403)
    message = await service.edit_message(message_id, current_user.id, data.content)
    if not message:
        return error_response("Сообщение не найдено или нет прав", status_code=404)
    await uow.commit()
    return success_response(
        data=ChatMessageResponse.model_validate(message).model_dump(),
        message="Сообщение изменено",
    )


@router.delete("/{room_id}/messages/{message_id}")
async def delete_message(
    room_id: int,
    message_id: int,
    current_user=Depends(require_active_user),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    if not await service.is_participant(room_id, current_user.id):
        return error_response("Доступ запрещён", status_code=403)
    message = await service.soft_delete_message(message_id, current_user.id)
    if not message:
        return error_response("Сообщение не найдено или нет прав", status_code=404)
    await uow.commit()
    return success_response(
        data=ChatMessageResponse.model_validate(message).model_dump(),
        message="Сообщение удалено",
    )


@router.post("/{room_id}/participants")
async def add_participant(
    room_id: int,
    user_id: int,
    current_user=Depends(require_permission(Permission.MESSAGE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    participant = await service.add_participant(room_id, user_id)
    await uow.commit()
    return success_response(
        data=ChatParticipantResponse.model_validate(participant).model_dump(),
        message="Участник добавлен",
        status_code=201,
    )


@router.delete("/{room_id}/participants/{user_id}")
async def remove_participant(
    room_id: int,
    user_id: int,
    current_user=Depends(require_permission(Permission.MESSAGE_MANAGE)),
    uow: UnitOfWork = Depends(get_uow),
):
    service = ChatService(uow)
    removed = await service.remove_participant(room_id, user_id)
    if not removed:
        return error_response("Участник не найден", status_code=404)
    await uow.commit()
    return success_response(data=None, message="Участник удалён")
