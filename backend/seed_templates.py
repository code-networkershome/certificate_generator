"""
Database seed script to add certificate templates
Run this after starting the application to populate the database with templates
"""

import asyncio
from pathlib import Path
from sqlalchemy import select
from database import async_session, init_db
from db_models import Template
from config import get_settings

settings = get_settings()

# Templates directory from config
TEMPLATES_DIR = Path(settings.TEMPLATES_PATH)


# Template definitions
TEMPLATES = [
    {
        "name": "Classic Blue",
        "description": "Elegant blue borders with gold corner accents and professional typography",
        "file": "default_template.html",
        "thumbnail_url": "/downloads/previews/classic_blue_preview.png"
    },
    {
        "name": "Dark Orange",
        "description": "Dark theme with vibrant orange accents and modern corporate feel",
        "file": "aws_cloud_template.html",
        "thumbnail_url": "/downloads/previews/dark_orange_preview.png"
    },
    {
        "name": "Dark Teal",
        "description": "Navy blue background with cyan/teal highlights and sleek design",
        "file": "networking_template.html",
        "thumbnail_url": "/downloads/previews/dark_teal_preview.png"
    },
    {
        "name": "Elegant Gold",
        "description": "Cream background with ornate gold borders and official seal",
        "file": "elegant_gold_template.html",
        "thumbnail_url": "/downloads/previews/elegant_gold_preview.png"
    },
    {
        "name": "Gradient Purple",
        "description": "Vibrant purple-pink gradient with glassmorphism effects",
        "file": "modern_gradient_template.html",
        "thumbnail_url": "/downloads/previews/gradient_purple_preview.png"
    },
    {
        "name": "Terminal Green",
        "description": "Dark theme with green terminal-style text and hacker aesthetic",
        "file": "cybersecurity_template.html",
        "thumbnail_url": "/downloads/previews/terminal_green_preview.png"
    },
    {
        "name": "Clean Minimal",
        "description": "Pure white background with left accent bar and modern typography",
        "file": "minimalist_template.html",
        "thumbnail_url": "/downloads/previews/clean_minimal_preview.png"
    },
    {
        "name": "Rose Blush",
        "description": "Soft pink gradient with elegant rose accents and premium feel",
        "file": "rose_blush_template.html",
        "thumbnail_url": "/downloads/previews/rose_blush_preview.png"
    },
    {
        "name": "Sky Azure",
        "description": "Light sky blue with premium badge elements and clean design",
        "file": "sky_azure_template.html",
        "thumbnail_url": "/downloads/previews/sky_azure_preview.png"
    },
    {
        "name": "Harvard Crimson",
        "description": "Prestigious crimson & gold with triple ornate borders and official seal",
        "file": "harvard_crimson_template.html",
        "thumbnail_url": "/downloads/previews/harvard_crimson_preview.png"
    },
    {
        "name": "Oxford Navy",
        "description": "Classic navy blue with wax seal, flourishes, and Latin inscription",
        "file": "oxford_navy_template.html",
        "thumbnail_url": "/downloads/previews/oxford_navy_preview.png"
    },
    {
        "name": "IIT Saffron",
        "description": "Indian tri-color borders with chakra decorations and embossed gold seal",
        "file": "iit_saffron_template.html",
        "thumbnail_url": "/downloads/previews/iit_saffron_preview.png"
    },
    {
        "name": "Midnight Pro",
        "description": "Premium dark theme with gold accents and professional typography",
        "file": "midnight_pro_template.html",
        "thumbnail_url": "/downloads/previews/midnight_pro_preview.png"
    },
    {
        "name": "Corporate Platinum",
        "description": "Clean, high-end professional look with platinum accents",
        "file": "corporate_platinum_template.html",
        "thumbnail_url": "/downloads/previews/corporate_platinum_preview.png"
    },
    {
        "name": "Structured Grid",
        "description": "Modern, data-driven feel with structured grid layout",
        "file": "structured_grid_template.html",
        "thumbnail_url": "/downloads/previews/structured_grid_preview.png"
    },
    {
        "name": "Luxury Marble",
        "description": "High-end marble background with elegant gold framing",
        "file": "luxury_marble_template.html",
        "thumbnail_url": "/downloads/previews/luxury_marble_preview.png"
    },
    {
        "name": "Midnight Minimal",
        "description": "Ultra-clean dark theme with high-contrast professional look",
        "file": "midnight_minimal_template.html",
        "thumbnail_url": "/downloads/previews/midnight_minimal_preview.png"
    },
    {
        "name": "University Diploma",
        "description": "Traditional, formal academic look for degrees and diplomas",
        "file": "university_diploma_template.html",
        "thumbnail_url": "/downloads/previews/university_diploma_preview.png"
    },
    {
        "name": "Royal Purple",
        "description": "Regal, sophisticated theme with purple and gold highlights",
        "file": "royal_purple_template.html",
        "thumbnail_url": "/downloads/previews/royal_purple_preview.png"
    },
    {
        "name": "Vintage Letterpress",
        "description": "Textured paper feel with classic vintage typography",
        "file": "vintage_letterpress_template.html",
        "thumbnail_url": "/downloads/previews/vintage_letterpress_preview.png"
    },
    {
        "name": "Classic Parchment",
        "description": "Traditional antique parchment look with ornate borders",
        "file": "classic_parchment_template.html",
        "thumbnail_url": "/downloads/previews/classic_parchment_preview.png"
    },
    {
        "name": "Elegant Damask",
        "description": "Sophisticated pattern background for formal recognitions",
        "file": "elegant_damask_template.html",
        "thumbnail_url": "/downloads/previews/elegant_damask_preview.png"
    },
    {
        "name": "Modern Abstract",
        "description": "Vibrant geometric shapes for creative and dynamic awards",
        "file": "modern_abstract_template.html",
        "thumbnail_url": "/downloads/previews/modern_abstract_preview.png"
    },
    {
        "name": "Sunset Orange",
        "description": "Warm, energetic gradient aesthetic for skills certificates",
        "file": "sunset_orange_template.html",
        "thumbnail_url": "/downloads/previews/sunset_orange_preview.png"
    },
    {
        "name": "Ocean Blue",
        "description": "Cool, professional gradient with a modern tech feel",
        "file": "ocean_blue_template.html",
        "thumbnail_url": "/downloads/previews/ocean_blue_preview.png"
    },
    {
        "name": "Soft Pastel",
        "description": "Friendly, gentle colors for modern and approachable awards",
        "file": "soft_pastel_template.html",
        "thumbnail_url": "/downloads/previews/soft_pastel_preview.png"
    },
    {
        "name": "Bold Impact",
        "description": "Strong high-contrast typography for non-traditional honors",
        "file": "bold_impact_template.html",
        "thumbnail_url": "/downloads/previews/bold_impact_preview.png"
    },
    {
        "name": "Industrial Steel",
        "description": "Robust, metallic tech aesthetic for engineering and IT",
        "file": "industrial_steel_template.html",
        "thumbnail_url": "/downloads/previews/industrial_steel_preview.png"
    },
    {
        "name": "Minimalist Black",
        "description": "Ultra-clean high-contrast theme for professional mastery",
        "file": "minimalist_black_template.html",
        "thumbnail_url": "/downloads/previews/minimalist_black_preview.png"
    },
    {
        "name": "Vibrant Tech",
        "description": "Electric blue tech highlights for modern digital certifications",
        "file": "vibrant_tech_template.html",
        "thumbnail_url": "/downloads/previews/vibrant_tech_preview.png"
    },
    {
        "name": "Global Network",
        "description": "International standard look for global qualifications",
        "file": "global_network_template.html",
        "thumbnail_url": "/downloads/previews/global_network_preview.png"
    },
    {
        "name": "Eco-Friendly Green",
        "description": "Nature-inspired green theme for sustainable achievements",
        "file": "eco_friendly_green_template.html",
        "thumbnail_url": "/downloads/previews/eco_friendly_green_preview.png"
    }
]


async def seed_templates():
    """Seed the database with certificate templates"""
    
    print(f"Templates directory: {TEMPLATES_DIR.absolute()}")
    print(f"Templates exist: {TEMPLATES_DIR.exists()}")
    
    if TEMPLATES_DIR.exists():
        print(f"Files in templates dir: {list(TEMPLATES_DIR.glob('*.html'))}")
    
    await init_db()
    
    async with async_session() as db:
        # Delete existing templates to reseed
        result = await db.execute(select(Template))
        existing = result.scalars().all()
        
        if existing:
            print(f"Deleting {len(existing)} existing templates...")
            for t in existing:
                await db.delete(t)
            await db.commit()
        
        print("Seeding templates...")
        count = 0
        
        for tmpl_data in TEMPLATES:
            # Read HTML content from file
            html_file = TEMPLATES_DIR / tmpl_data["file"]
            
            if html_file.exists():
                html_content = html_file.read_text(encoding='utf-8')
                
                template = Template(
                    name=tmpl_data["name"],
                    description=tmpl_data["description"],
                    html_content=html_content,
                    thumbnail_url=tmpl_data.get("thumbnail_url"),
                    is_active=True
                )
                db.add(template)
                print(f"  [OK] Added: {tmpl_data['name']}")
                count += 1
            else:
                print(f"  [SKIP] Template file not found: {html_file}")
        
        await db.commit()
        print(f"\nSeeded {count} templates successfully!")


async def seed_templates_if_empty():
    """Seed templates only if the database has no templates (for auto-startup)"""
    async with async_session() as db:
        # Check if templates exist
        result = await db.execute(select(Template).limit(1))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Templates already exist in database, skipping seeding")
            return
        
        print("No templates found, seeding database...")
    
    # Call full seed function
    await seed_templates()


if __name__ == "__main__":
    asyncio.run(seed_templates())
