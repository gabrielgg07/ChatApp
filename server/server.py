import socket
import threading
from concurrent.futures import ThreadPoolExecutor
import client_function as cli_func
from firebase_setup import get_db  # Import Firestore setup
import server_functions as sf
# If you've set up Firebase with google-cloud-firestore or firebase_admin, 
# you can import and initialize it here. For now, we'll leave it out 
# since we're just focusing on the basic socket connection.
#
# from google.cloud import firestore
# db = firestore.Client()  # example if you've configured Firestore credentials

HOST = '0.0.0.0'  # Listen on all network interfaces
PORT = 5000       # Arbitrary port to accept connections


# ─── Global state ─────────────────────────────────────────────
# user_id → client socket
active_users      = {}
active_users_lock = threading.Lock()
# ──────────────────────────────────────────────────────────────

def handle_client(client_socket, address, db):
    print(f"[+] {address} connected")

    # 1️⃣ Expect: "JOIN <chat_id> <user_id>\n"
    init = client_socket.recv(1024)
    if not init:
        return client_socket.close()

    try:
        _, user_id = init.decode().strip().split(maxsplit=1)
    except ValueError:
        print(f"[!] Bad JOIN from {address!r}: {init!r}")
        return client_socket.close()

    # 2️⃣ Register this user → socket
    with active_users_lock:
        active_users[user_id] = client_socket
    print(f"    → user {user_id!r} logged in")

    try:
        while True:
            data = client_socket.recv(4096)
            if not data:
                break

            # 3️⃣ Delegate to your compartmentalized handler,
            # passing everything it needs to broadcast later
            cli_func.run(
                data,
                db,
                user_id,
                active_users,
                active_users_lock
            )

    except ConnectionResetError:
        pass
    finally:
        # 4️⃣ Cleanup on disconnect
        with active_users_lock:
            active_users.pop(user_id, None)
        client_socket.close()
        print(f"[-] user {user_id!r} disconnected")

def main():
    db = get_db()
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"[+] Listening on {HOST}:{PORT}")

    # Create a pool of, say, 10 worker threads
    with ThreadPoolExecutor(max_workers=10) as pool:
        try:
            while True:
                client_sock, addr = server.accept()
                # Instead of Thread(...).start(), submit to the pool:
                pool.submit(handle_client, client_sock, addr, db)
        except KeyboardInterrupt:
            print("\n[!] Shutting down…")
        finally:
            server.close()

if __name__ == "__main__":
    main()