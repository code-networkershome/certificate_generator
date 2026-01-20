-- Certificate Generation System - Database Schema
-- PostgreSQL

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- At least one contact method required
    CONSTRAINT chk_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================
-- OTP SESSIONS TABLE
-- ============================================
CREATE TABLE otp_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    otp_code        VARCHAR(6) NOT NULL,
    otp_type        VARCHAR(10) NOT NULL CHECK (otp_type IN ('email', 'phone')),
    target          VARCHAR(255) NOT NULL,  -- email address or phone number
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    is_verified     BOOLEAN DEFAULT FALSE,
    attempts        INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_max_attempts CHECK (attempts <= 5)
);

CREATE INDEX idx_otp_sessions_target ON otp_sessions(target, otp_type);
CREATE INDEX idx_otp_sessions_expires ON otp_sessions(expires_at) WHERE is_verified = FALSE;

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    html_content    TEXT NOT NULL,
    css_content     TEXT,
    thumbnail_url   VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_active ON templates(is_active) WHERE is_active = TRUE;

-- ============================================
-- CERTIFICATES TABLE
-- ============================================
CREATE TABLE certificates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id      VARCHAR(50) UNIQUE NOT NULL,  -- User-provided unique ID (e.g., NH-2026-00123)
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    template_id         UUID REFERENCES templates(id) ON DELETE SET NULL,
    
    -- Certificate data (stored as JSONB for flexibility)
    certificate_data    JSONB NOT NULL,
    
    -- Generated file paths
    pdf_path            VARCHAR(500),
    png_path            VARCHAR(500),
    jpg_path            VARCHAR(500),
    
    -- Metadata
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'failed')),
    generated_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_certificates_cert_id ON certificates(certificate_id);
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_status ON certificates(status);

-- ============================================
-- RATE LIMITING TABLE (for OTP)
-- ============================================
CREATE TABLE rate_limits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier      VARCHAR(255) NOT NULL,  -- email, phone, or IP
    action_type     VARCHAR(50) NOT NULL,   -- 'otp_send', 'otp_verify'
    attempt_count   INTEGER DEFAULT 1,
    window_start    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(identifier, action_type)
);

CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, action_type, window_start);
