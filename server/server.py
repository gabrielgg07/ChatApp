# server.py
import asyncio
import websockets
from websockets.legacy.server import serve
import client_function as cli_func
from firebase_setup import get_db  # your Firestore setup

import inspect



HOST = '0.0.0.0'
PORT = 5000

# user_id → websocket
active_users      = {}
active_users_lock = asyncio.Lock()

async def handle_client(ws, path):
    # 1️⃣ JOIN handshake: "JOIN <user_id>"

    print(f"[DEBUG] New connection from client. Path: {path}")
    init = await ws.recv()
    try:
        _, user_id = init.strip().split(maxsplit=1)
        print(f"[DEBUG] Handshake message received: {init}")
    except Exception:
        print(f"[ERROR] Failed during handshake: {e}")
        await ws.close()
        return

    async with active_users_lock:
        active_users[user_id] = ws
    print(f"[+] {user_id!r} connected")

    try:
        async for raw in ws:
            # delegate to your existing handler
            await cli_func.run_ws(
                raw,
                get_db(),
                user_id,
                active_users,
                active_users_lock
            )
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        async with active_users_lock:
            active_users.pop(user_id, None)
        print(f"[-] {user_id!r} disconnected")

print("[DEBUG] handle_client signature:", inspect.signature(handle_client))

async def main():
    print(f"[+] WebSocket server listening on ws://{HOST}:{PORT}")
    # this is the async context manager version
    print("[DEBUG] Type of handler being passed:", type(handle_client))
    print("[DEBUG] Is coroutine:", asyncio.iscoroutinefunction(handle_client))
    print("[DEBUG] Signature:", inspect.signature(handle_client))       
    async with serve(handle_client, HOST, PORT):
        # run forever
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
