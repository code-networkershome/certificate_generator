# Certificate Generation System

A production-ready SaaS web application for generating professional course certificates (AWS, Networking, Cloud, etc.) using JSON input and template-based rendering.

## Features

- **OTP-based Authentication** - Email or Phone OTP login (no passwords)
- **Template Selection** - Choose from multiple certificate templates
- **Single & Bulk Generation** - Generate individual or batch certificates
- **Multiple Output Formats** - PDF, PNG, JPG (300 DPI print-ready)
- **CSV Upload** - Bulk generate from CSV files
- **ZIP Download** - Download all bulk certificates in one archive

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python) |
| Frontend | React + Vite |
| Database | PostgreSQL |
| PDF Rendering | WeasyPrint |
| Image Conversion | pdf2image + Pillow |
| Deployment | Docker + Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- Poppler (for PDF to image conversion)

### Run with Docker

```bash
# Clone and navigate to project
cd certificate-builder

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r ../requirements.txt

# Run development server
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/send-otp` | POST | No | Send OTP to email/phone |
| `/auth/verify-otp` | POST | No | Verify OTP, get JWT |
| `/templates/list` | GET | JWT | List available templates |
| `/certificate/generate` | POST | JWT | Generate single certificate |
| `/certificate/bulk-generate` | POST | JWT | Bulk generation (JSON) |
| `/certificate/bulk-generate/csv` | POST | JWT | Bulk generation (CSV upload) |

## Certificate Input Schema

```json
{
  "student_name": "John Doe",
  "course_name": "AWS Cloud Practitioner",
  "issue_date": "2026-01-20",
  "certificate_id": "NH-2026-00123",
  "issuing_authority": "NetworkersHome",
  "signature_name": "Director",
  "signature_image_url": "https://example.com/sign.png",
  "logo_url": "https://example.com/logo.png"
}
```

## Project Structure

```
certificate-builder/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment configuration
│   ├── database.py          # Database connection
│   ├── db_models.py         # SQLAlchemy ORM models
│   ├── models.py            # Pydantic schemas
│   ├── dependencies.py      # JWT utilities
│   ├── routers/             # API endpoints
│   └── services/            # Business logic
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── api.js           # API client
│   │   └── index.css        # Styles
│   └── package.json
├── database/
│   └── schema.sql           # PostgreSQL schema
├── templates/
│   └── default_template.html
├── schemas/
│   └── certificate_schema.json
├── docs/
│   ├── rendering_pipeline.md
│   └── security_notes.md
├── docker-compose.yml
└── .env.example
```

## Security

- OTP expiry: 5 minutes
- Rate limiting: 5 attempts per 15 minutes
- JWT expiration: 24 hours
- Input validation via JSON Schema
- Unique certificate ID constraint

## License

MIT
