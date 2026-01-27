"""
Upload router for handling file uploads.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime

from config import get_settings

settings = get_settings()

router = APIRouter(prefix="/upload", tags=["uploads"])

print(f"DEBUG: uploads.py - settings.STORAGE_TYPE is: {settings.STORAGE_TYPE}")

# Initialize Supabase client if using Supabase storage
supabase_client = None
if settings.STORAGE_TYPE == "supabase":
    try:
        from supabase import create_client
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
    except ImportError:
        pass

# Storage directory for uploaded images (local only)
# Use STORAGE_PATH from env or fallback to /tmp for Render
UPLOAD_DIR = os.path.join(settings.STORAGE_PATH or "/tmp/storage", "uploads")

# Ensure upload directory exists (with error handling for restricted environments)
if settings.STORAGE_TYPE != "supabase":
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
    except PermissionError:
        # Fallback to /tmp if we can't create in the configured path
        UPLOAD_DIR = "/tmp/uploads"
        os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file (logo, signature, etc.)
    Returns the URL to access the uploaded image.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{timestamp}_{unique_id}{ext}"
    
    # Save file
    if settings.STORAGE_TYPE == "supabase" and supabase_client:
        # Upload to Supabase Storage
        upload_path = f"uploads/{filename}"
        try:
            bucket_name = settings.SUPABASE_STORAGE_BUCKET or "certificates"
            response = supabase_client.storage.from_(bucket_name).upload(
                path=upload_path,
                file=content,
                file_options={"content-type": f"image/{ext[1:]}" if ext != '.svg' else 'image/svg+xml'}
            )
            # Get public URL
            url = supabase_client.storage.from_(bucket_name).get_public_url(upload_path)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to Supabase Storage: {str(e)}"
            )
    else:
        # Local storage
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        # Return URL
        url = f"/storage/uploads/{filename}"
    
    return JSONResponse({
        "success": True,
        "url": url,
        "filename": filename
    })


@router.delete("/image/{filename}")
async def delete_image(filename: str):
    """
    Delete an uploaded image.
    """
    # Security check - ensure filename doesn't contain path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    if settings.STORAGE_TYPE == "supabase" and supabase_client:
        # Delete from Supabase Storage
        upload_path = f"uploads/{filename}"
        try:
            bucket_name = settings.SUPABASE_STORAGE_BUCKET or "certificates"
            supabase_client.storage.from_(bucket_name).remove([upload_path])
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete from Supabase Storage: {str(e)}"
            )
    else:
        # Local storage
        filepath = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        os.remove(filepath)
    
    return JSONResponse({"success": True, "message": "File deleted"})
