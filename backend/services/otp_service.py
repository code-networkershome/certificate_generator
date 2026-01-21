"""
OTP Service - Generation, storage, and verification
Email Service - SMTP integration for real email delivery
"""

import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from db_models import User, OTPSession, RateLimit
from config import get_settings

settings = get_settings()


class OTPService:
    """Service for OTP operations"""
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a cryptographically secure 6-digit OTP"""
        return ''.join(secrets.choice('0123456789') for _ in range(6))
    
    @staticmethod
    async def check_rate_limit(
        db: AsyncSession,
        identifier: str,
        action_type: str
    ) -> bool:
        """
        Check if action is rate limited.
        Returns True if allowed, False if rate limited.
        """
        window_start = datetime.now(timezone.utc) - timedelta(minutes=settings.OTP_RATE_LIMIT_MINUTES)
        now = datetime.now(timezone.utc)
        
        # Find ANY existing rate limit record for this identifier+action_type
        stmt = select(RateLimit).where(
            and_(
                RateLimit.identifier == identifier,
                RateLimit.action_type == action_type
            )
        )
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()
        
        if record:
            # Record exists - check if it's within the rate limit window
            if record.window_start > window_start:
                # Within window - check if rate limited
                if record.attempt_count >= settings.OTP_MAX_ATTEMPTS:
                    return False  # Rate limited
                # Increment attempt count
                record.attempt_count += 1
            else:
                # Window expired - reset the record
                record.attempt_count = 1
                record.window_start = now
        else:
            # No record exists - create new one
            db.add(RateLimit(
                identifier=identifier,
                action_type=action_type,
                attempt_count=1,
                window_start=now
            ))
        
        return True
    
    @staticmethod
    async def get_or_create_user(
        db: AsyncSession,
        email: Optional[str] = None,
        phone: Optional[str] = None
    ) -> User:
        """Get existing user or create new one"""
        if email:
            stmt = select(User).where(User.email == email)
        else:
            stmt = select(User).where(User.phone == phone)
        
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(email=email, phone=phone)
            db.add(user)
            await db.flush()
        
        return user
    
    @staticmethod
    async def create_otp_session(
        db: AsyncSession,
        user: User,
        otp_type: str,
        target: str
    ) -> Tuple[OTPSession, str]:
        """Create a new OTP session and return OTP code"""
        otp_code = OTPService.generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        # Invalidate existing OTP sessions for this target
        stmt = select(OTPSession).where(
            and_(
                OTPSession.target == target,
                OTPSession.otp_type == otp_type,
                OTPSession.is_verified == False
            )
        )
        result = await db.execute(stmt)
        for old_session in result.scalars():
            await db.delete(old_session)
        
        # Create new session
        session = OTPSession(
            user_id=user.id,
            otp_code=otp_code,
            otp_type=otp_type,
            target=target,
            expires_at=expires_at
        )
        db.add(session)
        await db.flush()
        
        return session, otp_code
    
    @staticmethod
    async def verify_otp(
        db: AsyncSession,
        target: str,
        otp_type: str,
        otp_code: str
    ) -> Optional[User]:
        """
        Verify OTP and return user if valid.
        Returns None if verification fails.
        """
        now = datetime.now(timezone.utc)
        
        # Find OTP session
        stmt = select(OTPSession).where(
            and_(
                OTPSession.target == target,
                OTPSession.otp_type == otp_type,
                OTPSession.is_verified == False
            )
        ).order_by(OTPSession.created_at.desc())
        
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if not session:
            return None
        
        # Check expiry
        if session.expires_at < now:
            return None
        
        # Check attempts
        if session.attempts >= settings.OTP_MAX_ATTEMPTS:
            return None
        
        # Verify OTP
        if session.otp_code != otp_code:
            session.attempts += 1
            return None
        
        # Mark as verified
        session.is_verified = True
        
        # Get user
        stmt = select(User).where(User.id == session.user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        return user


class EmailService:
    """Real SMTP email service for production"""
    
    @staticmethod
    def _create_otp_email(to_email: str, otp_code: str) -> MIMEMultipart:
        """Create a beautiful HTML email with OTP"""
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Your OTP Code: {otp_code}'
        msg['From'] = f'{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>'
        msg['To'] = to_email
        
        # Plain text version
        text = f"""
Certificate Generator - OTP Verification

Your one-time password is: {otp_code}

This code will expire in {settings.OTP_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email.
        """
        
        # HTML version
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }}
        .header h1 {{ color: white; margin: 0; font-size: 24px; }}
        .content {{ padding: 40px 30px; text-align: center; }}
        .otp-box {{ background: #f8fafc; border: 2px dashed #6366f1; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .otp-code {{ font-size: 36px; font-weight: bold; color: #1e293b; letter-spacing: 8px; font-family: monospace; }}
        .expires {{ color: #64748b; font-size: 14px; margin-top: 20px; }}
        .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Certificate Generator</h1>
        </div>
        <div class="content">
            <p style="color: #475569; font-size: 16px;">Your verification code is:</p>
            <div class="otp-box">
                <span class="otp-code">{otp_code}</span>
            </div>
            <p class="expires">This code expires in <strong>{settings.OTP_EXPIRY_MINUTES} minutes</strong></p>
        </div>
        <div class="footer">
            If you didn't request this code, you can safely ignore this email.
        </div>
    </div>
</body>
</html>
        """
        
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        return msg
    
    @staticmethod
    async def send_otp(email: str, otp_code: str) -> bool:
        """Send OTP via SMTP email"""
        
        # If SMTP is not enabled, fall back to mock
        if not settings.SMTP_ENABLED:
            print(f"[MOCK EMAIL] Sending OTP {otp_code} to {email}")
            return True
        
        try:
            msg = EmailService._create_otp_email(email, otp_code)
            
            # Connect to SMTP server
            if settings.SMTP_USE_TLS:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
            
            # Login and send
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(
                settings.SMTP_FROM_EMAIL,
                email,
                msg.as_string()
            )
            server.quit()
            
            print(f"[EMAIL SENT] OTP sent to {email}")
            return True
            
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send OTP to {email}: {str(e)}")
            # Fall back to mock in case of error
            print(f"[FALLBACK] OTP for {email}: {otp_code}")
            return False


class MockSMSService:
    """Mock SMS service for development"""
    
    @staticmethod
    async def send_otp(phone: str, otp_code: str) -> bool:
        """Send OTP via SMS (mock implementation)"""
        print(f"[MOCK SMS] Sending OTP {otp_code} to {phone}")
        # In production: integrate with Twilio, AWS SNS, etc.
        return True


# Alias for backward compatibility
MockEmailService = EmailService
