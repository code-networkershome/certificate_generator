# Security Constraints

This document outlines the security measures implemented in the Certificate Generation System.

---

## 1. OTP Expiry Handling

### Configuration
- **Expiry Time**: 5 minutes (300 seconds)
- **Storage**: Database with `expires_at` timestamp

### Implementation

```python
from datetime import datetime, timedelta, timezone

OTP_EXPIRY_MINUTES = 5

def create_otp_session(user_id: str, otp_type: str, target: str) -> OTPSession:
    otp_code = generate_secure_otp()  # 6-digit cryptographically secure
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    return OTPSession(
        user_id=user_id,
        otp_code=otp_code,
        otp_type=otp_type,
        target=target,
        expires_at=expires_at,
        is_verified=False,
        attempts=0
    )

def verify_otp_not_expired(otp_session: OTPSession) -> bool:
    return datetime.now(timezone.utc) < otp_session.expires_at
```

### Cleanup
- Expired OTPs are cleaned up via scheduled job (every 15 minutes)
- Query: `DELETE FROM otp_sessions WHERE expires_at < NOW() AND is_verified = FALSE`

---

## 2. Rate Limiting for OTP

### Limits

| Action | Limit | Window |
|--------|-------|--------|
| Send OTP | 5 requests | 15 minutes |
| Verify OTP | 5 attempts | 15 minutes |

### Implementation

```python
from fastapi import HTTPException, Request
from datetime import datetime, timedelta, timezone

RATE_LIMITS = {
    'otp_send': {'max_attempts': 5, 'window_minutes': 15},
    'otp_verify': {'max_attempts': 5, 'window_minutes': 15}
}

async def check_rate_limit(identifier: str, action: str) -> None:
    config = RATE_LIMITS.get(action)
    if not config:
        return
    
    window_start = datetime.now(timezone.utc) - timedelta(minutes=config['window_minutes'])
    
    # Query existing rate limit record
    record = await db.query(RateLimit).filter(
        RateLimit.identifier == identifier,
        RateLimit.action_type == action,
        RateLimit.window_start > window_start
    ).first()
    
    if record and record.attempt_count >= config['max_attempts']:
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {config['window_minutes']} minutes."
        )
    
    # Increment or create record
    if record:
        record.attempt_count += 1
    else:
        db.add(RateLimit(
            identifier=identifier,
            action_type=action,
            attempt_count=1,
            window_start=datetime.now(timezone.utc)
        ))
    
    await db.commit()
```

### Additional Protections
- Rate limit by IP address for unauthenticated endpoints
- Rate limit by user ID for authenticated endpoints

---

## 3. JWT Expiration

### Configuration
- **Access Token Expiry**: 24 hours
- **Algorithm**: HS256 (use RS256 in production for key rotation)

### Implementation

```python
import jwt
from datetime import datetime, timedelta, timezone

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')  # From environment
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'sub': user_id,
        'iat': now,
        'exp': now + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, 'Token has expired')
    except jwt.InvalidTokenError:
        raise HTTPException(401, 'Invalid token')
```

### Security Notes
- Store JWT_SECRET_KEY in environment variables only
- Minimum key length: 256 bits
- Consider refresh tokens for longer sessions

---

## 4. Input Validation

### JSON Schema Validation

All certificate input is validated against a strict JSON Schema:

```json
{
  "required": ["student_name", "course_name", "issue_date", "certificate_id", "issuing_authority"],
  "additionalProperties": false
}
```

### Pydantic Validation

```python
class CertificateInput(BaseModel):
    student_name: str = Field(..., min_length=1, max_length=255)
    course_name: str = Field(..., min_length=1, max_length=255)
    issue_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    certificate_id: str = Field(..., min_length=1, max_length=50)
    issuing_authority: str = Field(..., min_length=1, max_length=255)
    signature_name: Optional[str] = Field(None, max_length=255)
    signature_image_url: Optional[HttpUrl] = None
    logo_url: Optional[HttpUrl] = None
```

### URL Validation
- Only HTTP/HTTPS URLs accepted
- URLs are validated but external content is not fetched server-side (security)
- Consider allowlisting domains for signature/logo URLs

### SQL Injection Prevention
- All database queries use parameterized queries via SQLAlchemy ORM
- No raw SQL string concatenation

### XSS Prevention
- Template rendering uses Jinja2 with autoescaping enabled
- User input is HTML-escaped before injection into templates

---

## 5. Unique Certificate ID Constraint

### Database Constraint

```sql
CREATE UNIQUE INDEX idx_certificates_cert_id ON certificates(certificate_id);
```

### Application Layer Check

```python
async def validate_certificate_id_unique(certificate_id: str) -> None:
    existing = await db.query(Certificate).filter(
        Certificate.certificate_id == certificate_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Certificate ID '{certificate_id}' already exists"
        )
```

### Bulk Generation Handling
- Pre-validate all certificate IDs before processing
- Return list of duplicate IDs in error response

---

## Security Checklist

| Control | Status |
|---------|--------|
| OTP expiry (5 min) | ✅ |
| OTP rate limiting | ✅ |
| JWT expiration | ✅ |
| Input validation | ✅ |
| Unique certificate ID | ✅ |
| HTTPS enforcement | Configure at proxy |
| CORS configuration | Configure per environment |
| SQL injection prevention | ✅ (ORM) |
| XSS prevention | ✅ (Jinja2 autoescaping) |

---

## Environment Variables

Required security-related environment variables:

```bash
# JWT Configuration
JWT_SECRET_KEY=<256-bit-random-key>

# Database (use connection pooling)
DATABASE_URL=postgresql://user:pass@host:5432/db

# OTP Services
EMAIL_OTP_SERVICE_API_KEY=<key>
SMS_OTP_SERVICE_API_KEY=<key>

# Storage
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<key>
```

**Never commit these to version control.**
