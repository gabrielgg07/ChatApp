import uuid
from datetime import datetime
import bcrypt
import jwtF as jwtF


def create_chat_room(db, user_ids):
    if (len(user_ids) < 2):
        print("need more people")
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
        user_ref.update({"chat_rooms": user_data.get("chat_rooms", []) + [chat_id]})

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
def send_message(db, chat_id, user_id, message):
    """
    Send a message in a chat room.
    
    Stores the message in a subcollection called "messages" under the chat room document,
    and updates the chat room's metadata (last_message and timestamp).
    """
    message_id = str(uuid.uuid4())
    message_data = {
        "message_id": message_id,
        "user_id": user_id,
        "content": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Add message to the "messages" subcollection
    db.collection("chat_rooms").document(chat_id)\
      .collection("messages").document(message_id).set(message_data)
    
    # Optionally update the chat room document with the last message info
    db.collection("chat_rooms").document(chat_id).update({
        "last_message": message,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    print(f"Message from {user_id}: {message} added to chat room {chat_id}")

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


