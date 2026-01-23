"""
Admin Router - Certificate Management
Provides endpoints for admin users to view and revoke certificates
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database import get_db
from db_models import Certificate, User, Template
from routers.certificates import get_current_user
from services.certificate_service import storage_service

router = APIRouter(prefix="/admin", tags=["Admin"])


# Pydantic models
class CertificateListItem(BaseModel):
    id: str
    certificate_id: str
    student_name: str
    course_name: str
    issue_date: str
    generated_at: Optional[str]
    status: str
    is_revoked: bool
    revoked_at: Optional[str]
    revoke_reason: Optional[str]
    user_email: Optional[str]
    template_name: Optional[str]
    download_urls: dict


class RevokeCertificateRequest(BaseModel):
    reason: Optional[str] = None


class AdminStatsResponse(BaseModel):
    total_certificates: int
    active_certificates: int
    revoked_certificates: int
    total_users: int


# Helper to check if user is admin
async def get_admin_user(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> User:
    """Verify that current user is an admin."""
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return user


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get admin dashboard statistics."""
    # Total certificates
    total_result = await db.execute(select(func.count(Certificate.id)))
    total_certificates = total_result.scalar() or 0
    
    # Revoked certificates
    revoked_result = await db.execute(
        select(func.count(Certificate.id)).where(Certificate.is_revoked == True)
    )
    revoked_certificates = revoked_result.scalar() or 0
    
    # Active certificates
    active_certificates = total_certificates - revoked_certificates
    
    # Total users
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0
    
    return AdminStatsResponse(
        total_certificates=total_certificates,
        active_certificates=active_certificates,
        revoked_certificates=revoked_certificates,
        total_users=total_users
    )


@router.get("/certificates")
async def list_all_certificates(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = 1,
    limit: int = 50,
    status_filter: Optional[str] = None,
    revoked_only: bool = False
):
    """List all certificates for admin management."""
    offset = (page - 1) * limit
    
    # Build query
    query = select(Certificate).order_by(Certificate.created_at.desc())
    
    if status_filter:
        query = query.where(Certificate.status == status_filter)
    
    if revoked_only:
        query = query.where(Certificate.is_revoked == True)
    
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    certificates = result.scalars().all()
    
    # Get total count
    count_query = select(func.count(Certificate.id))
    if status_filter:
        count_query = count_query.where(Certificate.status == status_filter)
    if revoked_only:
        count_query = count_query.where(Certificate.is_revoked == True)
    
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Format response
    items = []
    for cert in certificates:
        # Get user email
        user_email = None
        if cert.user_id:
            user_result = await db.execute(
                select(User.email).where(User.id == cert.user_id)
            )
            user_email = user_result.scalar()
        
        # Get template name
        template_name = None
        if cert.template_id:
            template_result = await db.execute(
                select(Template.name).where(Template.id == cert.template_id)
            )
            template_name = template_result.scalar()
        
        # Build download URLs
        download_urls = {}
        if cert.pdf_path:
            download_urls["pdf"] = storage_service.get_download_url(cert.pdf_path)
        if cert.png_path:
            download_urls["png"] = storage_service.get_download_url(cert.png_path)
        if cert.jpg_path:
            download_urls["jpg"] = storage_service.get_download_url(cert.jpg_path)
        
        items.append({
            "id": str(cert.id),
            "certificate_id": cert.certificate_id,
            "student_name": cert.certificate_data.get("student_name", ""),
            "course_name": cert.certificate_data.get("course_name", ""),
            "issue_date": cert.certificate_data.get("issue_date", ""),
            "generated_at": cert.generated_at.isoformat() if cert.generated_at else None,
            "status": cert.status,
            "is_revoked": cert.is_revoked if hasattr(cert, 'is_revoked') else False,
            "revoked_at": cert.revoked_at.isoformat() if hasattr(cert, 'revoked_at') and cert.revoked_at else None,
            "revoke_reason": cert.revoke_reason if hasattr(cert, 'revoke_reason') else None,
            "user_email": user_email,
            "template_name": template_name,
            "download_urls": download_urls
        })
    
    return {
        "certificates": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.post("/certificates/{certificate_id}/revoke")
async def revoke_certificate(
    certificate_id: str,
    request: RevokeCertificateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Revoke a certificate making it invalid."""
    # Find certificate
    result = await db.execute(
        select(Certificate).where(Certificate.certificate_id == certificate_id)
    )
    cert = result.scalar_one_or_none()
    
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    if cert.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate is already revoked"
        )
    
    # Revoke the certificate
    cert.is_revoked = True
    cert.revoked_at = datetime.now(timezone.utc)
    cert.revoked_by = admin.id
    cert.revoke_reason = request.reason
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Certificate {certificate_id} has been revoked",
        "certificate_id": certificate_id,
        "revoked_at": cert.revoked_at.isoformat()
    }


@router.post("/certificates/{certificate_id}/restore")
async def restore_certificate(
    certificate_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Restore a revoked certificate."""
    # Find certificate
    result = await db.execute(
        select(Certificate).where(Certificate.certificate_id == certificate_id)
    )
    cert = result.scalar_one_or_none()
    
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    if not cert.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate is not revoked"
        )
    
    # Restore the certificate
    cert.is_revoked = False
    cert.revoked_at = None
    cert.revoked_by = None
    cert.revoke_reason = None
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Certificate {certificate_id} has been restored",
        "certificate_id": certificate_id
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = 1,
    limit: int = 50
):
    """List all users."""
    offset = (page - 1) * limit
    
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    users = result.scalars().all()
    
    # Get total count
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar() or 0
    
    items = []
    for user in users:
        # Count certificates for user
        cert_count_result = await db.execute(
            select(func.count(Certificate.id)).where(Certificate.user_id == user.id)
        )
        cert_count = cert_count_result.scalar() or 0
        
        items.append({
            "id": str(user.id),
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_admin": user.is_admin if hasattr(user, 'is_admin') else False,
            "created_at": user.created_at.isoformat(),
            "certificate_count": cert_count
        })
    
    return {
        "users": items,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.post("/users/{user_id}/toggle-admin")
async def toggle_user_admin(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Toggle admin status for a user."""
    import uuid as uuid_module
    
    try:
        user_uuid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow removing own admin status
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own admin status"
        )
    
    user.is_admin = not user.is_admin
    await db.commit()
    
    return {
        "success": True,
        "user_id": user_id,
        "is_admin": user.is_admin
    }
