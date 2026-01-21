"""
Certificate Generation System - FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import auth, templates, certificates, uploads
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
    Path(settings.STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMPLATES_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.STORAGE_PATH + "/uploads").mkdir(parents=True, exist_ok=True)
    
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


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Router Registration
app.include_router(auth.router)
app.include_router(templates.router)
app.include_router(certificates.router)
app.include_router(uploads.router)


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


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Certificate Generation System",
        "version": "1.0.0",
        "docs": "/docs"
    }
