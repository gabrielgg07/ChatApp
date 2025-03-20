import socket
import threading
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

def handle_client(client_socket, address, db):
    """
    This function will handle the connection for one client.
    For now, it does nothing but print a message.
    We'll build on this as we go.
    """
    print(f"[+] User connected from {address}")

    try:
        # Keep the connection open until the client disconnects
        while True:
            data = client_socket.recv(1024)
            if not data:
                # No data means the client closed the connection
                print(f"[-] User disconnected from {address}")
                break
            else:
                cli_func.run(data, db)

            # For now, we do nothing with the data...
            # We'll add logic in future steps.
            # Just echo the data back or pass for now:
            pass
    except ConnectionResetError:
        print(f"[-] Connection forcibly closed by {address}")
    finally:
        client_socket.close()

def main():
    """
    Main server loop:
      1. Create a socket.
      2. Bind to HOST:PORT.
      3. Listen for incoming client connections.
      4. For each connection, start a new thread with handle_client.
    """
    db = get_db() #get the database to pass
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, PORT))
    server_socket.listen(5)

    print(f"[+] Server listening on {HOST}:{PORT}")

    try:
        while True:
            client_sock, addr = server_socket.accept()
            # Spawn a thread to handle each new client so we can handle many connections simultaneously
            client_thread = threading.Thread(target=handle_client, args=(client_sock, addr, db), daemon=True)
            client_thread.start()
    except KeyboardInterrupt:
        print("\n[!] Shutting down server.")
    finally:
        server_socket.close()

if __name__ == "__main__":
    main()