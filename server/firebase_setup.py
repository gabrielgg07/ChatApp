import os, json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

key_path = os.getenv("FIREBASE_KEY_JSON")
if not key_path or not os.path.isfile(key_path):
    raise FileNotFoundError("FIREBASE_KEY_JSON path is invalid or not set")

with open(key_path) as f:
    service_account_info = json.load(f)

cred = credentials.Certificate(service_account_info)

# Initialize Firebase
firebase_admin.initialize_app(cred)

# Get Firestore database reference
db = firestore.client()

print("Firebase connected!")

# Export db for use in other files
def get_db():
    return db
