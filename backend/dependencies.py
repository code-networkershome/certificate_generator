"""
FastAPI Dependencies for Certificate Generation System
JWT authentication with Supabase
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

from models import TokenPayload


# ============================================
# CONFIGURATION
# ============================================

# Supabase JWT secret - get from Supabase Dashboard -> Settings -> API -> JWT Secret
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "your-supabase-jwt-secret")
JWT_ALGORITHM = "HS256"


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


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a Supabase JWT access token.
    Supports both HS256 (symmetric) and ES256 (asymmetric) algorithms.
    
    Args:
        token: The JWT token string from Supabase
        
    Returns:
        Dict with user information from token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    import requests
    from jwt import PyJWKClient
    
    try:
        # First, inspect the token to see what algorithm it uses
        unverified_header = jwt.get_unverified_header(token)
        token_alg = unverified_header.get('alg', 'unknown')
        print(f"Token algorithm: {token_alg}")
        
        if token_alg == "ES256":
            # ES256 uses asymmetric encryption - need to get public key from JWKS
            # Get Supabase URL from environment or extract from token
            supabase_url = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
            
            if not supabase_url:
                # Try to extract project ref from token issuer
                try:
                    unverified_payload = jwt.decode(token, options={"verify_signature": False})
                    issuer = unverified_payload.get("iss", "")
                    if "supabase" in issuer:
                        supabase_url = issuer.replace("/auth/v1", "")
                except:
                    pass
            
            if supabase_url:
                jwks_url = f"{supabase_url.rstrip('/')}/.well-known/jwks.json"
                print(f"Fetching JWKS from: {jwks_url}")
                
                try:
                    jwks_client = PyJWKClient(jwks_url)
                    signing_key = jwks_client.get_signing_key_from_jwt(token)
                    
                    payload = jwt.decode(
                        token,
                        signing_key.key,
                        algorithms=["ES256"],
                        options={"verify_aud": False}
                    )
                    return payload
                except Exception as e:
                    print(f"JWKS verification failed: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token verification failed",
                        headers={"WWW-Authenticate": "Bearer"}
                    )
            else:
                print("WARNING: SUPABASE_URL not configured for ES256 token verification")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Server configuration error - SUPABASE_URL not set",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        else:
            # HS256 uses symmetric encryption with JWT secret
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            return payload
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidAlgorithmError as e:
        print(f"JWT algorithm error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token algorithm",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidSignatureError:
        print("JWT signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as e:
        print(f"JWT decode error: {e}")
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
    Dependency to extract and validate current user from Supabase JWT token.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        User ID string from the Supabase token (UUID)
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    token_payload = decode_access_token(token)
    
    # Supabase tokens have 'sub' field with user UUID
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: no user ID"
        )
    
    return user_id


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
