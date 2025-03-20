import firebase_admin
from firebase_admin import credentials, firestore

# Load service account JSON
cred = credentials.Certificate("firebase-key.json")

# Initialize Firebase
firebase_admin.initialize_app(cred)

# Get Firestore database reference
db = firestore.client()

print("Firebase connected!")

# Export db for use in other files
def get_db():
    return db
