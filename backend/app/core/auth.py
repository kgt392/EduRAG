"""Password hashing and opaque teacher-session helpers."""

import hashlib
import os
import secrets

import bcrypt

COOKIE_NAME = "edurag_teacher_session"
SESSION_MAX_HOURS = int(os.getenv("EDURAG_SESSION_MAX_HOURS", "12"))
COOKIE_SECURE = os.getenv("EDURAG_COOKIE_SECURE", "false").lower() in {
    "1", "true", "yes", "on"
}


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password must be no longer than 72 UTF-8 bytes.")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        return False
    try:
        return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
