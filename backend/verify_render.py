import asyncio
import uuid
from database import init_db, async_session
from db_models import Template
from sqlalchemy import select
from services.certificate_service import certificate_service

async def verify():
    await init_db()
    async with async_session() as db:
        # Get Midnight Pro template
        stmt = select(Template).where(Template.name == 'Midnight Pro')
        result = await db.execute(stmt)
        template = result.scalar_one()
        
        data = {
            "student_name": "Antigravity Verification User",
            "course_name": "Advanced Agentic Coding and Extremely Long Course Name for Text Wrapping Verification Purposes",
            "issue_date": "2026-01-20",
            "certificate_id": "VERIFY-2026-001",
            "issuing_authority": "Google DeepMind",
            "signature_name": "Lead Developer",
            "description_text": "This is a very long description text specifically designed to test the automatic text wrapping and centering logic that was implemented across all templates. It should span multiple lines while staying perfectly centered in the layout."
        }
        
        print(f"Generating certificate for template: {template.name}...")
        urls = await certificate_service.generate_certificate(
            db,
            template,
            data,
            output_formats=["pdf", "png"]
        )
        print(f"Generated successfully: {urls}")

if __name__ == "__main__":
    asyncio.run(verify())
