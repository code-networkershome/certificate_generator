from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel

from database import get_db
from db_models import User
from dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

class UserProfile(BaseModel):
    id: str
    email: Optional[str]
    phone: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: str

@router.get("/me", response_model=UserProfile)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get current user's profile information."""
    import uuid as uuid_module
    
    user = None
    
    # Try to find user by ID first
    try:
        user_uuid = uuid_module.UUID(current_user)
        result = await db.execute(
            select(User).where(User.id == user_uuid)
        )
        user = result.scalar_one_or_none()
    except (ValueError, TypeError):
        pass
    
    # Fallback: try to find by email
    if not user:
        result = await db.execute(
            select(User).where(User.email == current_user)
        )
        user = result.scalar_one_or_none()
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
        
    return UserProfile(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at.isoformat()
    )
