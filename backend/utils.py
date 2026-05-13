import bcrypt

def hash_password(password: str) -> str:
    """Hashes a plain-text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if a plain-text password matches the hashed one."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())