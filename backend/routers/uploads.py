"""
Upload router for handling file uploads.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["uploads"])

# Storage directory for uploaded images
UPLOAD_DIR = "/app/storage/uploads"

# Ensure upload directory exists
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
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check - ensure filename doesn't contain path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    os.remove(filepath)
    
    return JSONResponse({"success": True, "message": "File deleted"})
