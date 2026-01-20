"""
Generate preview images for all templates.
Run this script after seeding templates.
"""
import asyncio
from pathlib import Path
from database import async_session, init_db
from services.certificate_service import rendering_service

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

# Output directory for previews
PREVIEW_DIR = Path(settings.STORAGE_PATH) / 'previews'


async def generate_previews():
    """Generate preview images for all active templates."""
    await init_db()
    
    # Create preview directory
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    
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
                filepath = PREVIEW_DIR / filename
                
                # Save preview image
                with open(filepath, 'wb') as f:
                    f.write(img_bytes)
                
                print(f"  [OK] Generated: {filename}")
                
            except Exception as e:
                print(f"  [ERROR] {template.name}: {e}")
    
    print(f"\nPreviews saved to: {PREVIEW_DIR}")


if __name__ == '__main__':
    asyncio.run(generate_previews())
