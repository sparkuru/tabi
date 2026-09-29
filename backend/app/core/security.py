"""Password hashing and browser session secrets."""

from hashlib import sha256
from secrets import token_urlsafe

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_PASSWORD_HASHER = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return _PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Check a password without exposing verification failures."""
    try:
        return _PASSWORD_HASHER.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def new_secret() -> str:
    """Create an unpredictable browser secret."""
    return token_urlsafe(32)


def secret_hash(value: str) -> str:
    """Store only a digest of an issued secret."""
    return sha256(value.encode("utf-8")).hexdigest()
