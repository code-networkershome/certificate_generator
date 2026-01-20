import asyncio
import os
from database import init_db, async_session
from db_models import Template
from sqlalchemy import select
from services.certificate_service import certificate_service

async def reproduce():
    await init_db()
    async with async_session() as db:
        # Get Vintage Letterpress template
        stmt = select(Template).where(Template.name == 'Vintage Letterpress')
        result = await db.execute(stmt)
        template = result.scalar_one()
        
        data = {
            "student_name": "ASDFG YDRSDWYDGIEWUFOUWHDF",
            "course_name": "AWS CLOUD PRACTITIONER",
            "issue_date": "2026-01-20",
            "certificate_id": "NH-2026-123456",
            "issuing_authority": "NETWORKERSHOME",
            "signature_name": "Director",
            "description_text": "has successfully satisfied all established requirements and demonstrated professional proficiency in the official curriculum of"
        }
        
        print(f"Generating reproduction certificate for template: {template.name}...")
        urls = await certificate_service.generate_certificate(
            db,
            template,
            data,
            output_formats=["pdf", "png"]
        )
        print(f"Generated successfully: {urls}")

if __name__ == "__main__":
    asyncio.run(reproduce())
