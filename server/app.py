from firebase_setup import get_db  # Import Firestore setup
import server_functions as sf

# Run the server
if __name__ == "__main__":
    # Get Firestore database reference
    db = get_db()

    id = sf.login_user(db, "eric", "password")

    print(id)