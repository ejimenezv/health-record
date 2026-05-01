"""
Autenticación JWT para la API.
"""
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError, jwt

from src.core.config import get_settings
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


def create_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
