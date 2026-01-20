"""
FastAPI Dependencies for Certificate Generation System
JWT authentication and user extraction
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from models import TokenPayload


# ============================================
# CONFIGURATION (move to config file in production)
# ============================================

JWT_SECRET_KEY = "your-secret-key-change-in-production"  # Use env variable
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


# ============================================
# SECURITY SCHEME
# ============================================

security = HTTPBearer()


# ============================================
# JWT UTILITIES
# ============================================

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token for authenticated user.
    
    Args:
        user_id: The unique identifier of the user
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": expire
    }
    
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> TokenPayload:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: The JWT token string
        
    Returns:
        TokenPayload with user information
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ============================================
# DEPENDENCY FUNCTIONS
# ============================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Dependency to extract and validate current user from JWT token.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        User ID string from the token
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    token_payload = decode_access_token(token)
    
    # In production: verify user still exists in database
    # user = await get_user_by_id(token_payload.sub)
    # if not user or not user.is_active:
    #     raise HTTPException(status_code=401, detail="User not found or inactive")
    
    return token_payload.sub


async def get_current_active_user(
    user_id: str = Depends(get_current_user)
) -> str:
    """
    Dependency to get current active user.
    Extend this to return full user object from database.
    
    Args:
        user_id: User ID from token
        
    Returns:
        User ID (or User object in production)
    """
    # In production: fetch full user object and verify active status
    # user = await user_service.get_by_id(user_id)
    # if not user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    # return user
    
    return user_id


# ============================================
# RATE LIMITING (skeleton)
# ============================================

async def check_rate_limit(identifier: str, action: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
    """
    Check if an action is rate limited.
    
    Args:
        identifier: Email, phone, or IP address
        action: Type of action (e.g., 'otp_send', 'otp_verify')
        max_attempts: Maximum allowed attempts in window
        window_minutes: Time window in minutes
        
    Returns:
        True if action is allowed, raises HTTPException if rate limited
    """
    # In production: implement with Redis or database
    # Example logic:
    # 1. Get current attempt count for identifier+action within window
    # 2. If count >= max_attempts, raise HTTPException(429)
    # 3. Otherwise, increment count and allow
    
    # Placeholder - always allow in skeleton
    return True
