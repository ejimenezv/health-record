"""JWT authentication for WebSocket connections."""
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import HTTPException
from jose import JWTError, jwt

from src.core.config import get_settings

settings = get_settings()


@dataclass
class TokenData:
    """Decoded JWT payload for an authenticated user."""
    user_id: str
    username: Optional[str] = None
    roles: List[str] = field(default_factory=list)


async def verify_websocket_token(token: str) -> TokenData:
    """Verify JWT token for WebSocket connections."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return TokenData(
            user_id=user_id,
            username=payload.get("username"),
            roles=payload.get("roles", []),
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
