"""
Pydantic Models for Certificate Generation System
Request and Response models for all API endpoints
"""

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from enum import Enum


# ============================================
# ENUMS
# ============================================

class OTPType(str, Enum):
    EMAIL = "email"
    PHONE = "phone"


class CertificateStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    FAILED = "failed"


class OutputFormat(str, Enum):
    PDF = "pdf"
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"


# ============================================
# AUTH MODELS
# ============================================

class SendOTPRequest(BaseModel):
    """Request model for sending OTP"""
    otp_type: OTPType
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9]{7,15}$')

    class Config:
        json_schema_extra = {
            "example": {
                "otp_type": "email",
                "email": "user@example.com"
            }
        }


class SendOTPResponse(BaseModel):
    """Response model for OTP sending"""
    success: bool
    message: str
    expires_in_seconds: int = 300


class VerifyOTPRequest(BaseModel):
    """Request model for OTP verification"""
    otp_type: OTPType
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9]{7,15}$')
    otp_code: str = Field(..., min_length=6, max_length=6)


class VerifyOTPResponse(BaseModel):
    """Response model for successful OTP verification"""
    success: bool
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


class TokenPayload(BaseModel):
    """JWT Token payload structure"""
    sub: str  # user_id
    exp: datetime
    iat: datetime


# ============================================
# TEMPLATE MODELS
# ============================================

class TemplateResponse(BaseModel):
    """Response model for a single template"""
    id: str
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: bool
    created_at: datetime


class TemplateListResponse(BaseModel):
    """Response model for template listing"""
    templates: List[TemplateResponse]
    total: int


# ============================================
# CERTIFICATE MODELS
# ============================================

class CertificateInput(BaseModel):
    """Input model for certificate data - matches JSON Schema"""
    student_name: str = Field(..., min_length=1, max_length=255)
    course_name: str = Field(..., min_length=1, max_length=255)
    issue_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')  # YYYY-MM-DD
    certificate_id: Optional[str] = Field(None, max_length=50)  # Auto-generated if not provided
    issuing_authority: str = Field(..., min_length=1, max_length=255)
    signature_name: Optional[str] = None
    signature_image_url: Optional[str] = None  # URL string, optional
    logo_url: Optional[str] = None  # URL string, optional
    custom_body: Optional[str] = Field(None, max_length=500)  # Custom description text
    certificate_title: Optional[str] = Field(None, max_length=100)  # e.g. "Certificate of Achievement"
    certificate_subtitle: Optional[str] = Field(None, max_length=100)  # e.g. "Academic Excellence"
    description_text: Optional[str] = Field(None, max_length=500)  # Full custom description

    class Config:
        json_schema_extra = {
            "example": {
                "student_name": "John Doe",
                "course_name": "AWS Cloud Practitioner",
                "issue_date": "2026-01-20",
                "issuing_authority": "NetworkersHome",
                "signature_name": "Director",
                "certificate_title": "Certificate of Completion",
                "certificate_subtitle": "Professional Development",
                "description_text": "has successfully completed all requirements",
                "custom_body": "for exceptional performance and dedication"
            }
        }


class GenerateCertificateRequest(BaseModel):
    """Request model for single certificate generation"""
    template_id: str
    certificate_data: CertificateInput
    output_formats: List[OutputFormat] = [OutputFormat.PDF]


class GenerateCertificateResponse(BaseModel):
    """Response model for certificate generation"""
    success: bool
    certificate_id: str
    download_urls: dict[str, str]  # format -> URL mapping
    generated_at: datetime


class BulkGenerateRequest(BaseModel):
    """Request model for bulk certificate generation"""
    template_id: str
    certificates: List[CertificateInput]
    output_formats: List[OutputFormat] = [OutputFormat.PDF]


class BulkCertificateResult(BaseModel):
    """Result for a single certificate in bulk generation"""
    certificate_id: str
    success: bool
    error: Optional[str] = None
    download_urls: Optional[dict[str, str]] = None


class BulkGenerateResponse(BaseModel):
    """Response model for bulk certificate generation"""
    success: bool
    total: int
    successful: int
    failed: int
    results: List[BulkCertificateResult]
    zip_download_url: Optional[str] = None


# ============================================
# ERROR MODELS
# ============================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class ValidationErrorResponse(BaseModel):
    """Validation error response"""
    error: str = "Validation Error"
    details: List[dict[str, Any]]


# ============================================
# PREVIEW/EDITOR MODELS
# ============================================

class ElementPosition(BaseModel):
    """Position override for a dragged element"""
    element_id: str
    x: float  # pixels from left
    y: float  # pixels from top

class ElementStyle(BaseModel):
    """Style override for an element"""
    element_id: str
    font_size: Optional[str] = None  # e.g. "24px"
    color: Optional[str] = None  # e.g. "#ff0000"
    font_weight: Optional[str] = None  # e.g. "bold"
    text_align: Optional[str] = None  # e.g. "center"

class PreviewCertificateRequest(BaseModel):
    """Request model for certificate preview (no file generation)"""
    template_id: str
    certificate_data: dict  # Flexible dict for partial data during editing
    element_positions: Optional[List[ElementPosition]] = None
    element_styles: Optional[List[ElementStyle]] = None

class PreviewResponse(BaseModel):
    """Response model with rendered HTML for preview"""
    html: str
    template_id: str
    template_name: str

class FinalizePreviewRequest(BaseModel):
    """Request to generate final certificate from edited preview"""
    template_id: str
    certificate_data: dict
    element_positions: Optional[List[ElementPosition]] = None
    element_styles: Optional[List[ElementStyle]] = None
    output_formats: List[OutputFormat] = [OutputFormat.PDF]
