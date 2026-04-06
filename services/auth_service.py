import hashlib
import secrets
import bcrypt
from flask import request, session


def ensure_csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def is_valid_csrf():
    expected = session.get("csrf_token")
    provided = request.headers.get("X-CSRF-Token", "")
    return bool(expected and provided and secrets.compare_digest(expected, provided))


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password, stored_hash):
    if not stored_hash:
        return False, False
    if stored_hash.startswith("$2"):
        try:
            ok = bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
            return ok, False
        except ValueError:
            return False, False
    legacy_ok = hashlib.sha256(password.encode()).hexdigest() == stored_hash
    return legacy_ok, legacy_ok
