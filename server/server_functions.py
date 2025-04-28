import uuid
from datetime import datetime
import threading
import bcrypt
import jwtF as jwtF

def create_chat_room(db, user_ids):
    if len(user_ids) < 2:
        print("Need more people to create a chat room.")
        return

    chat_id = str(uuid.uuid4())  # Generate unique chat ID

    # Create chat room entry
    db.collection("chat_rooms").document(chat_id).set({
        "chat_id": chat_id,
        "users": user_ids,
        "last_message": "",
        "timestamp": datetime.utcnow().isoformat()
    })

    # Update each user's chat list
    for user_id in user_ids:
        user_ref = db.collection("users").document(user_id)
        user_data = user_ref.get().to_dict()
        if user_data is None:
            print(f"User {user_id} does not exist!")
            continue

        # Safely update the chat_rooms field
        chat_rooms = user_data.get("chat_rooms", [])
        chat_rooms.append(chat_id)
        user_ref.update({"chat_rooms": chat_rooms})

    print(f"Chat room {chat_id} created!")
    return chat_id


def add_user_to_chat(db, chat_id, user_id):
    
    # Retrieve the user document directly by user_id
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        print("User does not exist")
        return

    # Add chat_id to the user's "chat_rooms" array field
    user_ref.update({
        "chat_rooms": ArrayUnion([chat_id])
    })
    chat_room_ref = db.collection("chat_rooms").document(chat_id)
    chat_room_ref.update({
        "users": ArrayUnion([user_id])
    })
    print(f"User {user_id} added to chat room {chat_id}")


def get_users_in_chat(db, chat_id):
    """
    Return the list of user_id strings for the given chat room.
    If the room doesn’t exist or has no users field, returns [].
    """
    room_ref = db.collection("chat_rooms").document(chat_id)
    room_doc = room_ref.get()
    if not room_doc.exists:
        return []
    data = room_doc.to_dict()
    # assume your chat-room document has a "users" array field
    return data.get("users", [])


def send_message(db,
                 chat_id: str,
                 user_id: str,
                 message: str,
                 activeUsers: dict,
                 activeUsersLock: threading.Lock):
    """
    1) Store the message in Firestore under chat_rooms/<chat_id>/messages
    2) Update the chat room metadata (last_message, timestamp)
    3) Broadcast over sockets to any active users in that chat
    """

    # 1️⃣ Persist to Firestore
    message_id = str(uuid.uuid4())
    ts = datetime.utcnow().isoformat()
    message_data = {
        "message_id": message_id,
        "user_id":    user_id,
        "content":    message,
        "timestamp":  ts
    }

    # add to subcollection
    db.collection("chat_rooms") \
      .document(chat_id) \
      .collection("messages") \
      .document(message_id) \
      .set(message_data)

    # update last_message & timestamp
    db.collection("chat_rooms") \
      .document(chat_id) \
      .update({
          "last_message": message,
          "timestamp":    ts
      })

    print(f"Message from {user_id}: {message} added to chat room {chat_id}")

    # 2️⃣ Fetch the canonical list of users in this chat room
    room_user_ids = get_users_in_chat(db, chat_id)

    # 3️⃣ Broadcast to any connected users in that room
    with activeUsersLock:
        for uid in room_user_ids:
            # skip the sender, and skip anyone not currently connected
            if uid == user_id or uid not in activeUsers:
                continue

            sock = activeUsers[uid]
            try:
                # send them the message; you can adjust formatting as needed
                sock.sendall(f"{user_id}: {message}\n".encode("utf-8"))
            except Exception as e:
                # on error (broken pipe, etc.), remove from activeUsers
                print(f"[!] Failed to send to {uid}, removing: {e}")
                del activeUsers[uid]

def get_all_messages(db, chat_id):
    print("Running get_all_messages...")
    message_docs = db.collection("chat_rooms").document(chat_id)\
                     .collection("messages")\
                     .order_by("timestamp")\
                     .get()
    print("Found", len(message_docs), "message documents")
    messages = [doc.to_dict() for doc in message_docs]
    return messages
    for message in messages:
        print(message)

def hash_password(password):
    """ Hash a password securely using bcrypt. """
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode(), salt)
    return hashed_password.decode()  # Convert bytes to string for storage

def is_username_taken(db, username):
    """ Check if a username already exists in Firestore. """
    # Using keyword arguments to avoid warnings:
    users_ref = db.collection("users").where(
        field_path="username",
        op_string="==",
        value=username
    ).get()
    return len(users_ref) > 0

def is_id_taken(db, userId):
    """ Check if a username already exists in Firestore. """
    # Using keyword arguments to avoid warnings:
    users_ref = db.collection("users").where(
        field_path="user_id",
        op_string="==",
        value=userId
    ).get()
    return len(users_ref) > 0
    
def create_user(db, username, password):
    user_id = str(uuid.uuid4())
    """Check if username already exists"""
    if (is_username_taken(db, username)):
        print("username already in use!!")
        return {"error": "Username already exists"}

    """Check if ID already exists"""
    while (is_id_taken(db, user_id)):
        user_id = str(uuid.uuid4())
        print("Error try new id")
        

    """ Create a user with a hashed password and store it in Firestore. """
    hashed_password = hash_password(password)  # Hash the password

    db.collection("users").document(user_id).set({
        "user_id": user_id,
        "username": username,
        "password": hashed_password,
        "chat_rooms": []
    })
    print(f"User {username} created!")
    return user_id


def login_user(db, username, input_password):
    """
    Attempts to log a user in:
      1. Query Firestore for a user with matching username.
      2. If found, compare stored hashed password with the input password.
    Returns True if login is successful, otherwise False.
    """

    # 1. Query for the user by username
    user_query = db.collection("users").where("username", "==", username).get()

    # If no user found
    if not user_query:
        print("No user with that username.")
        return None

    # user_query is a list of documents; pick the first if username is unique
    user_doc = user_query[0]
    user_data = user_doc.to_dict()

    # 2. Compare stored hash with the input password
    stored_hash = user_data["password"]  # The hashed password in Firestore

    if bcrypt.checkpw(input_password.encode("utf-8"), stored_hash.encode("utf-8")):
        print("Login successful!")
    else:
        print("Invalid password.")
        return None

    user_id = user_data["user_id"]
        # 3. Generate a JWT token containing the user_id (as "sub")
    token = jwtF.generate_jwt({"sub": user_id})

    # 4. Return the token (and optionally the user_id)
    return {
        "token": token,
        "user_id": user_id
    }


