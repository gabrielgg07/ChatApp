import server_functions as serv_func

import threading

# Global dictionary mapping user IDs to their connected client sockets
connected_users = {}
# A lock to guard access to connected_users
connected_users_lock = threading.Lock()

def add_connected_user(user_id, client_socket):
    with connected_users_lock:
        connected_users[user_id] = client_socket

def remove_connected_user(user_id):
    with connected_users_lock:
        if user_id in connected_users:
            del connected_users[user_id]

def get_connected_user(user_id):
    with connected_users_lock:
        return connected_users.get(user_id)


def commandProcess(command, arguments, db):
    if (command == "create_user"):
        if len(arguments) != 2:
            print("invalid arguments")
        else:
            serv_func.create_user(db, arguments[0], arguments[1])
    elif (command == "login_user"):
        if len(arguments) != 2:
            print("invalid arguments")
        else:
            serv_func.login_user(db, arguments[0], arguments[1])
    elif (command == "create_chat"):
        serv_func.create_chat_room(db, arguments)
    elif (command == "send_message"):
        if len(arguments) < 3:
            print("invalid arguments")
            return
        serv_func.send_message(db, arguments[0], arguments[1], arguments[2:])
    elif (command == "get_all_messages"):
        if len(arguments) != 1:
            print("invalid arguments")
            return
        messages = serv_func.get_all_messages(db, arguments[0])
    elif (command == "add_user_to_chat"):

    return

def run(data, db):
    decoded = data.decode("utf-8").strip()  # yields "LOGIN testuser testpass"
    parts = decoded.split(" ")  # yields ['LOGIN', 'testuser', 'testpass']
    command = parts[0]
    arguments = parts[1:]
    returnVal = commandProcess(command, arguments, db)


