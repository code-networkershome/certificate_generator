"""
Authentication Router - OTP-based authentication endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
    OTPType
)
from database import get_db
from dependencies import create_access_token
from services.otp_service import OTPService, MockEmailService, MockSMSService
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/send-otp",
    response_model=SendOTPResponse,
    summary="Send OTP to email or phone",
    description="Generates and sends a 6-digit OTP to the specified email or phone number."
)
async def send_otp(
    request: SendOTPRequest,
    db: AsyncSession = Depends(get_db)
) -> SendOTPResponse:
    """Send OTP to user's email or phone."""
    
    # Validate contact method matches OTP type
    if request.otp_type == OTPType.EMAIL and not request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for email OTP"
        )
    
    if request.otp_type == OTPType.PHONE and not request.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required for phone OTP"
        )
    
    # Get identifier
    identifier = request.email if request.otp_type == OTPType.EMAIL else request.phone
    
    # Check rate limit
    allowed = await OTPService.check_rate_limit(db, identifier, "otp_send")
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many OTP requests. Try again in {settings.OTP_RATE_LIMIT_MINUTES} minutes."
        )
    
    # Get or create user
    user = await OTPService.get_or_create_user(
        db,
        email=request.email,
        phone=request.phone
    )
    
    # Create OTP session
    _, otp_code = await OTPService.create_otp_session(
        db,
        user,
        request.otp_type.value,
        identifier
    )
    
    # Send OTP (mock services for development)
    if request.otp_type == OTPType.EMAIL:
        await MockEmailService.send_otp(request.email, otp_code)
    else:
        await MockSMSService.send_otp(request.phone, otp_code)
    
    await db.commit()
    
    return SendOTPResponse(
        success=True,
        message=f"OTP sent to {identifier}",
        expires_in_seconds=settings.OTP_EXPIRY_MINUTES * 60
    )


@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    summary="Verify OTP and get access token",
    description="Verifies the OTP and returns a JWT access token on success."
)
async def verify_otp(
    request: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
) -> VerifyOTPResponse:
    """Verify OTP and issue JWT token."""
    
    # Validate contact method
    if request.otp_type == OTPType.EMAIL and not request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for email OTP verification"
        )
    
    if request.otp_type == OTPType.PHONE and not request.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required for phone OTP verification"
        )
    
    identifier = request.email if request.otp_type == OTPType.EMAIL else request.phone
    
    # Check rate limit for verification attempts
    allowed = await OTPService.check_rate_limit(db, identifier, "otp_verify")
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Try again later."
        )
    
    # Verify OTP
    user = await OTPService.verify_otp(
        db,
        identifier,
        request.otp_type.value,
        request.otp_code
    )
    
    if not user:
        await db.commit()  # Save attempt increment
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    await db.commit()
    
    # Generate JWT token
    access_token = create_access_token(str(user.id))
    
    return VerifyOTPResponse(
        success=True,
        access_token=access_token,
        token_type="bearer",
        expires_in_seconds=settings.JWT_EXPIRATION_HOURS * 3600
    )
