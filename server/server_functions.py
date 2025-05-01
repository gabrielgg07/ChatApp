import uuid
from datetime import datetime
import bcrypt
import jwtF as jwtF
import asyncio 

# Firestore array union helper
from google.cloud.firestore_v1 import ArrayUnion


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

        chat_rooms = user_data.get("chat_rooms", [])
        chat_rooms.append(chat_id)
        user_ref.update({"chat_rooms": chat_rooms})

    print(f"Chat room {chat_id} created!")
    return chat_id


def add_user_to_chat(db, chat_id, user_id):
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        print("User does not exist")
        return

    user_ref.update({
        "chat_rooms": ArrayUnion([chat_id])
    })
    chat_room_ref = db.collection("chat_rooms").document(chat_id)
    chat_room_ref.update({
        "users": ArrayUnion([user_id])
    })
    print(f"User {user_id} added to chat room {chat_id}")


def get_users_in_chat(db, chat_id):
    room_ref = db.collection("chat_rooms").document(chat_id)
    room_doc = room_ref.get()
    if not room_doc.exists:
        return []
    return room_doc.to_dict().get("users", [])

async def send_message(db,
                       chat_id: str,
                       user_id: str,
                       message: str,
                       activeUsers: dict,
                       activeUsersLock: asyncio.Lock):
    """
    1) Persist message to Firestore
    2) Update chat metadata
    3) Broadcast via WebSocket to connected users
    """
    # 1️⃣ Persist to Firestore
    message_id = str(uuid.uuid4())
    ts = datetime.utcnow().isoformat()
    db.collection("chat_rooms") \
      .document(chat_id) \
      .collection("messages") \
      .document(message_id) \
      .set({
          "message_id": message_id,
          "user_id":    user_id,
          "content":    message,
          "timestamp":  ts
      })

    # Update metadata
    db.collection("chat_rooms") \
      .document(chat_id) \
      .update({
          "last_message": message,
          "timestamp":    ts
      })

    print(f"Message from {user_id}: {message} added to chat room {chat_id}")

    # 2️⃣ Fetch members
    room_user_ids = get_users_in_chat(db, chat_id)

    # 3️⃣ Broadcast via async lock
    async with activeUsersLock:
        for uid in room_user_ids:
            if uid == user_id or uid not in activeUsers:
                continue
            ws = activeUsers[uid]
            try:
                await ws.send(f"{user_id}: {message}")
            except Exception as e:
                print(f"[!] Failed to send to {uid}, removing: {e}")
                activeUsers.pop(uid, None)

def get_all_messages(db, chat_id):
    """
    Retrieve all messages in a chat, including sender usernames.
    Returns a list of dicts with keys: message_id, user_id, username, content, timestamp
    """
    # 1. Fetch the raw message documents
    docs = (
        db.collection("chat_rooms")
          .document(chat_id)
          .collection("messages")
          .order_by("timestamp")
          .get()
    )

    messages = []
    for doc in docs:
        m = doc.to_dict()

        # 2. Lookup the sender's username
        user_id = m.get("user_id")
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        if user_doc.exists:
            m["username"] = user_doc.to_dict().get("username", user_id)
        else:
            m["username"] = user_id  # fallback to ID if no user record

        messages.append(m)

    return messages

def get_user_chats(db, username):
    """
    Given a username, return a list of their chat rooms with latest message and timestamp.
    Each entry is a dict: { chat_id, users, last_message, timestamp }
    Sorted by timestamp descending.
    """
    # find the user by username
    user_query = db.collection("users").where("username", "==", username).get()
    if not user_query:
        return []
    user_data = user_query[0].to_dict()
    chat_ids = user_data.get("chat_rooms", [])

    chats = []
    for cid in chat_ids:
        room_doc = db.collection("chat_rooms").document(cid).get()
        if not room_doc.exists:
            continue
        data = room_doc.to_dict()
        chats.append({
            "chat_id":     cid,
            "users":       data.get("users", []),
            "last_message": data.get("last_message", ""),
            "timestamp":    data.get("timestamp")
        })
    # sort by timestamp descending
    chats.sort(key=lambda x: x["timestamp"], reverse=True)
    return chats


def hash_password(password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode()


def is_username_taken(db, username):
    users_ref = db.collection("users").where(
        field_path="username",
        op_string="==",
        value=username
    ).get()
    return len(users_ref) > 0


def is_id_taken(db, userId):
    users_ref = db.collection("users").where(
        field_path="user_id",
        op_string="==",
        value=userId
    ).get()
    return len(users_ref) > 0


def create_user(db, username, password):
    user_id = str(uuid.uuid4())
    if is_username_taken(db, username):
        print("username already in use!!")
        return {"error": "Username already exists"}
    while is_id_taken(db, user_id):
        user_id = str(uuid.uuid4())
    hashed = hash_password(password)
    db.collection("users").document(user_id).set({
        "user_id":   user_id,
        "username":  username,
        "password":  hashed,
        "chat_rooms": []
    })
    print(f"User {username} created!")
    return user_id


def login_user(db, username, input_password):
    user_query = db.collection("users").where("username", "==", username).get()
    if not user_query:
        print("No user with that username.")
        return None

    user_data = user_query[0].to_dict()
    stored_hash = user_data["password"]
    if not bcrypt.checkpw(input_password.encode(), stored_hash.encode()):
        print("Invalid password.")
        return None

    token = jwtF.generate_jwt({"sub": user_data["user_id"]})
    return {"token": token, "user_id": user_data["user_id"]}
