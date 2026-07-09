# Chat Module

This folder contains the local Django implementation for chat-related APIs and
websocket realtime behavior.

The database models are imported through `core.chats.models`, but the concrete
Django model classes still live in `core.legacy_aidi.models`. This keeps the
existing `legacy_aidi` migrations and database table names unchanged while
separating chat code for maintenance.

Public endpoints stay compatible with the current frontend:

- `api/Chat/GetList`
- `api/Chat/CreateChat`
- `api/Chat/SendChat`
- `api/Chat/GetDetail`
- `api/Chat/SeenChat`
- `api/Chat/PinOrUnPinChat`
- `api/user/getlistdropdownForChats`
- `ws/chat`
