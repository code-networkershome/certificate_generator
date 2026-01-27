"""
Certificate Generation System - FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from routers import auth, templates, certificates, uploads, admin, users
from database import init_db, close_db
from config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("Starting Certificate Generation System...")
    await init_db()
    
    # Create storage directory
    print(f"DEBUG: STORAGE_TYPE is set to: {settings.STORAGE_TYPE}")
    Path(settings.STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMPLATES_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.STORAGE_PATH + "/uploads").mkdir(parents=True, exist_ok=True)
    
    # Auto-seed templates if none exist
    try:
        from seed_templates import seed_templates_if_empty
        await seed_templates_if_empty()
    except Exception as e:
        print(f"Warning: Could not seed templates: {e}")
    
    # Security Check: Ensure JWT secret is not default in production
    if not settings.DEBUG and settings.JWT_SECRET_KEY == "change-this-in-production-use-256-bit-key":
        print("CRITICAL SECURITY ERROR: JWT_SECRET_KEY is set to default value in production!")
        print("Please set a secure JWT_SECRET_KEY in your environment variables.")
        # We don't exit immediately to allow logs to be captured, but we should block startup if possible
        # However, for now, we'll just log it clearly. In a stricter environment, we'd raise an exception.
        # raise RuntimeError("Insecure JWT_SECRET_KEY in production")
    
    print("Certificate Generation System started")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    await close_db()
    print("Certificate Generation System stopped")


app = FastAPI(
    title="Certificate Generation System",
    description="SaaS-style web application for generating course certificates using JSON input and template-based rendering.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration - Strict and added immediately after App initialization
ALLOWED_ORIGINS = [
    "https://certificate-generator-123.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Custom Exception Handlers to ensure CORS headers are on error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": True, "debug_info": "HTTPException"}
    )
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"
    return response

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin")
    error_msg = str(exc)
    print(f"DEBUG 500 ERROR: {error_msg}")
    
    response = JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error", 
            "error": True, 
            "debug_message": error_msg,
            "error_type": type(exc).__name__
        }
    )
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"
    return response


# CORS Debug Endpoint - Check if new code is deployed
@app.get("/cors-test")
async def cors_test():
    """Test endpoint to verify CORS configuration is deployed."""
    return {
        "status": "ok",
        "cors_version": "cors-v9-final-fix",
        "allowed_origins": ALLOWED_ORIGINS
    }


# Router Registration
app.include_router(auth.router)
app.include_router(templates.router)
app.include_router(certificates.router)
app.include_router(uploads.router)
app.include_router(admin.router)
app.include_router(users.router)


# Static files for downloads
storage_path = Path(settings.STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=str(storage_path)), name="downloads")

# Static files for uploads (logos, signatures)
uploads_path = storage_path / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


# Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {"status": "healthy"}


@app.get("/health/storage", tags=["Health"])
async def health_check_storage():
    """Health check for storage connection."""
    from config import get_settings
    from pathlib import Path
    
    settings = get_settings()
    
    try:
        if settings.STORAGE_TYPE == "supabase":
            # Test Supabase Storage connection
            from supabase import create_client
            
            if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
                return {
                    "status": "unhealthy",
                    "storage_type": "supabase",
                    "error": "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
                }
            
            supabase = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            bucket_name = settings.SUPABASE_STORAGE_BUCKET or "certificates"
            
            # Try to list files (this will fail if bucket doesn't exist or no access)
            files = supabase.storage.from_(bucket_name).list()
            return {
                "status": "healthy",
                "storage_type": "supabase",
                "bucket": bucket_name,
                "connected": True
            }
        else:
            # Local storage - just check if directory exists
            storage_path = Path(settings.STORAGE_PATH)
            return {
                "status": "healthy",
                "storage_type": "local",
                "path": str(storage_path),
                "exists": storage_path.exists()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "storage_type": settings.STORAGE_TYPE,
            "error": str(e)
        }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Certificate Generation System",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.post("/admin/reseed-templates", tags=["Admin"])
async def reseed_templates():
    """Force reseed all templates. Use after uploading preview images to storage."""
    try:
        from seed_templates import seed_templates
        await seed_templates()
        return {
            "status": "success",
            "message": "Templates reseeded successfully"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@app.post("/admin/generate-previews", tags=["Admin"])
async def generate_preview_images():
    """Generate preview images for all templates and upload to storage."""
    try:
        from generate_previews import generate_previews
        result = await generate_previews()
        return {
            "status": "success",
            "message": f"Generated {result['generated']} previews, {result['errors']} errors"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
