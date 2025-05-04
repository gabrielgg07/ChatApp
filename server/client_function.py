import server_functions as serv_func
import asyncio
import json
from datetime import datetime
def json_serial(obj):
    """JSON serializer for objects not serializable by default"""
    if isinstance(obj, datetime):             # handles DatetimeWithNanoseconds too
        return obj.isoformat(timespec="milliseconds") + "Z"
    raise TypeError(f"{obj!r} is not JSON serializable")

async def run_ws(raw: str,
                 db,
                 user_id: str,
                 active_users: dict,
                 lock: asyncio.Lock):
    parts = raw.strip().split(" ")
    command = parts[0]
    args = parts[1:]

    if command == "create_user":
        if len(args) == 2:
            serv_func.create_user(db, args[0], args[1])
            await _reply(user_id, "OK user created", active_users, lock)
        else:
            await _reply(user_id, "ERROR invalid args for create_user", active_users, lock)

    elif command == "login_user":
        if len(args) == 2:
            result = serv_func.login_user(db, args[0], args[1])
            if result and "token" in result:
                await _reply(user_id, f"LOGIN_SUCCESS {result['token']}", active_users, lock)
            else:
                await _reply(user_id, "ERROR login failed", active_users, lock)
        else:
            await _reply(user_id, "ERROR invalid args for login_user", active_users, lock)

    elif command == "create_chat":
        serv_func.create_chat_room(db, args)
        await _reply(user_id, "OK chat created", active_users, lock)

    elif command == "send_message":
        if len(args) >= 3:
            chat_id, to_user, *words = args
            message = " ".join(words)
            await serv_func.send_message(db, chat_id, user_id, message, active_users, lock)
            await _reply(user_id, "OK message sent", active_users, lock)
        else:
            await _reply(user_id, "ERROR invalid args for send_message", active_users, lock)

    elif command == "get_chats":
        chats = serv_func.get_user_chats(db, user_id)
        await _reply(user_id, "CHATS " + json.dumps(chats), active_users, lock)

    elif command == "get_all_messages":
        if len(args) == 1:
            msgs = serv_func.get_all_messages(db, args[0])
        # send the full list as JSON
        await _reply(
            user_id,
            "MESSAGES_JSON " + json.dumps(msgs, default=json_serial),
            active_users,
            lock
        )

    elif command == "get_ai_insights":
        if len(args) == 1:
            insights = serv_func.get_ai_insights(db, args[0])
            if insights is not None:
                await _reply(user_id, "INSIGHTS " + json.dumps(insights), active_users, lock)
            else:
                await _reply(user_id, "INSIGHTS" + json.dumps({"error": "No insights found"}), active_users, lock)

    

    else:
        await _reply(user_id, f"ERROR unknown command {command}", active_users, lock)


async def _reply(user_id: str, message: str, active_users: dict, lock: asyncio.Lock):
    """Helper to send a one-off reply back to a single user."""
    async with lock:
        ws = active_users.get(user_id)
    if ws:
        await ws.send(message)
