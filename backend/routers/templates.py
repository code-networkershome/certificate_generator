"""
Templates Router - Certificate template management endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models import TemplateListResponse, TemplateResponse
from database import get_db
from dependencies import get_current_user
from services.certificate_service import rendering_service

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get(
    "/list",
    response_model=TemplateListResponse,
    summary="List available certificate templates",
    description="Returns all active certificate templates available for use."
)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> TemplateListResponse:
    """List all available certificate templates."""
    
    templates = await rendering_service.get_active_templates(db)
    
    template_responses = [
        TemplateResponse(
            id=str(t.id),
            name=t.name,
            description=t.description,
            thumbnail_url=t.thumbnail_url,
            is_active=t.is_active,
            created_at=t.created_at
        )
        for t in templates
    ]
    
    return TemplateListResponse(
        templates=template_responses,
        total=len(template_responses)
    )
