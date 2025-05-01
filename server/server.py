# server.py
import asyncio
import websockets
import client_function as cli_func
from firebase_setup import get_db  # your Firestore setup

HOST = '0.0.0.0'
PORT = 5000

# user_id → websocket
active_users      = {}
active_users_lock = asyncio.Lock()

async def handle_client(ws, path):
    # 1️⃣ JOIN handshake: "JOIN <user_id>"
    init = await ws.recv()
    try:
        _, user_id = init.strip().split(maxsplit=1)
    except Exception:
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

async def main():
    print(f"[+] WebSocket server listening on ws://{HOST}:{PORT}")
    # this is the async context manager version
    async with websockets.serve(handle_client, HOST, PORT):
        # run forever
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
