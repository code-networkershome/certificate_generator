"""
Environment Configuration for Certificate Generation System
Loads settings from environment variables with validation
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Certificate Generation System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/certificates",
        description="PostgreSQL connection URL"
    )
    
    # JWT
    JWT_SECRET_KEY: str = Field(
        default="change-this-in-production-use-256-bit-key",
        description="Secret key for JWT signing"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Supabase Configuration (for authentication)
    SUPABASE_URL: Optional[str] = Field(
        default=None,
        description="Supabase project URL for JWKS verification"
    )
    SUPABASE_JWT_SECRET: Optional[str] = Field(
        default=None,
        description="Supabase JWT secret for HS256 tokens"
    )
    
    # OTP
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RATE_LIMIT_MINUTES: int = 15
    
    # Storage
    STORAGE_TYPE: str = "local"  # "local", "s3", or "supabase"
    STORAGE_PATH: str = "./storage"
    S3_BUCKET: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_ENDPOINT: Optional[str] = None
    # Supabase Storage
    SUPABASE_STORAGE_BUCKET: Optional[str] = Field(
        default="certificates",
        description="Supabase Storage bucket name for certificates"
    )
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(
        default=None,
        description="Supabase service role key for storage operations"
    )
    
    # Templates
    TEMPLATES_PATH: str = "./templates"
    
    # CORS
    CORS_ORIGINS: str = "*"
    
    # SMTP Email Configuration
    SMTP_ENABLED: bool = False  # Set to True to enable real email sending
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None  # For Gmail, use App Password
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Certificate Generator"
    SMTP_USE_TLS: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
