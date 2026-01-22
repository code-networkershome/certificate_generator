"""
Generate preview images for all templates.
Run this script after seeding templates.
Supports both local storage and Supabase Storage.
"""
import asyncio
from pathlib import Path
from database import async_session, init_db
from services.certificate_service import rendering_service
from db_models import Template
from sqlalchemy import select

from config import get_settings

settings = get_settings()

# Sample data for preview
SAMPLE_DATA = {
    'student_name': 'John Doe',
    'course_name': 'Sample Course Certificate',
    'issue_date': '2026-01-20',
    'certificate_id': 'SAMPLE-001',
    'issuing_authority': 'NetworkersHome',
    'signature_name': 'Director',
    'logo_url': None,
    'signature_image_url': None
}

# Output directory for previews (local)
PREVIEW_DIR = Path(settings.STORAGE_PATH) / 'previews'


def get_supabase_client():
    """Get Supabase client for storage operations."""
    if settings.STORAGE_TYPE != "supabase":
        return None
    
    try:
        from supabase import create_client
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return None
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except ImportError:
        return None


def upload_to_supabase(supabase_client, file_bytes: bytes, filename: str) -> str:
    """Upload file to Supabase Storage and return public URL."""
    bucket = settings.SUPABASE_STORAGE_BUCKET or "certificates"
    path = f"previews/{filename}"
    
    try:
        # Try to remove existing file first (ignore errors)
        try:
            supabase_client.storage.from_(bucket).remove([path])
        except:
            pass
        
        # Upload new file
        supabase_client.storage.from_(bucket).upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": "image/png"}
        )
        
        # Return public URL
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
    except Exception as e:
        raise Exception(f"Failed to upload to Supabase: {str(e)}")


async def generate_previews():
    """Generate preview images for all active templates and upload to storage."""
    await init_db()
    
    # Check storage type
    supabase_client = get_supabase_client()
    use_supabase = supabase_client is not None
    
    if use_supabase:
        print(f"Using Supabase Storage (bucket: {settings.SUPABASE_STORAGE_BUCKET})")
    else:
        print(f"Using local storage: {PREVIEW_DIR}")
        PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    
    generated_count = 0
    error_count = 0
    
    async with async_session() as db:
        templates = await rendering_service.get_active_templates(db)
        
        print(f"Generating previews for {len(templates)} templates...")
        
        for template in templates:
            try:
                # Render HTML
                html = rendering_service.render_html(template.html_content, SAMPLE_DATA)
                
                # Generate PDF
                pdf_bytes = rendering_service.render_pdf(html)
                
                # Convert to image (PNG)
                img_bytes = rendering_service.convert_to_image(pdf_bytes, 'png', dpi=150)
                
                # Generate filename from template name
                filename = template.name.lower().replace(' ', '_').replace('-', '_') + '_preview.png'
                
                if use_supabase:
                    # Upload to Supabase Storage
                    thumbnail_url = upload_to_supabase(supabase_client, img_bytes, filename)
                else:
                    # Save to local storage
                    filepath = PREVIEW_DIR / filename
                    with open(filepath, 'wb') as f:
                        f.write(img_bytes)
                    thumbnail_url = f"/downloads/previews/{filename}"
                
                # Update template with thumbnail URL
                stmt = select(Template).where(Template.id == template.id)
                result = await db.execute(stmt)
                db_template = result.scalar_one()
                db_template.thumbnail_url = thumbnail_url
                
                print(f"  [OK] {template.name} -> {thumbnail_url}")
                generated_count += 1
                
            except Exception as e:
                print(f"  [ERROR] {template.name}: {e}")
                error_count += 1
        
        # Commit all thumbnail URL updates
        await db.commit()
    
    print(f"\nCompleted: {generated_count} generated, {error_count} errors")
    return {"generated": generated_count, "errors": error_count}


if __name__ == '__main__':
    asyncio.run(generate_previews())
