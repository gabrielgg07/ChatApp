import jwt
import datetime
import os

JWT_SECRET = os.environ.get("JWT_SECRET", "my_super_secret_key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 1

def generate_jwt(payload):
    """Generate a JWT with an expiration."""
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    # PyJWT (v2+) returns a string in Python 3+ automatically. If not:
    # token = token.decode("utf-8") if isinstance(token, bytes) else token
    return token

def verify_jwt(token):
    """Verify and decode a JWT. Returns payload if valid, or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        print("Token has expired.")
        return None
    except jwt.InvalidTokenError:
        print("Invalid token.")
        return None
