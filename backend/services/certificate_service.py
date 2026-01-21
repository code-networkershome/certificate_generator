"""
Certificate Rendering Service
Handles template loading, rendering, and format conversion
"""

import os
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML, CSS
from pdf2image import convert_from_bytes
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from db_models import Template, Certificate
from config import get_settings

settings = get_settings()


class RenderingService:
    """Service for certificate rendering operations"""
    
    def __init__(self):
        """Initialize Jinja2 environment"""
        template_path = Path(settings.TEMPLATES_PATH)
        template_path.mkdir(parents=True, exist_ok=True)
        
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_path)),
            autoescape=select_autoescape(['html', 'xml'])
        )
    
    async def get_template(self, db: AsyncSession, template_id: str) -> Optional[Template]:
        """Get template by ID from database"""
        try:
            template_uuid = uuid.UUID(template_id)
        except ValueError:
            return None
        
        stmt = select(Template).where(Template.id == template_uuid, Template.is_active == True)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_active_templates(self, db: AsyncSession) -> List[Template]:
        """Get all active templates"""
        stmt = select(Template).where(Template.is_active == True)
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    def render_html(self, html_content: str, data: dict) -> str:
        """
        Render template HTML with provided data.
        Uses Jinja2 template syntax.
        """
        # Create template from string
        template = self.jinja_env.from_string(html_content)
        
        # Prepare data with image handling
        # Pass both logo_url and logo_image for template compatibility
        logo_value = data.get('logo_url') or None
        signature_value = data.get('signature_image_url') or None
        
        render_data = {
            **data,
            'logo_url': logo_value,
            'logo_image': logo_value,
            'signature_image': signature_value,
            'signature_image_url': signature_value
        }
        
        return template.render(**render_data)
    
    def render_pdf(self, html_content: str, css_content: Optional[str] = None) -> bytes:
        """
        Render HTML to PDF using WeasyPrint.
        Returns PDF as bytes.
        """
        html = HTML(string=html_content)
        
        stylesheets = []
        if css_content:
            stylesheets.append(CSS(string=css_content))
        
        return html.write_pdf(stylesheets=stylesheets, presentational_hints=True)
    
    def convert_to_image(
        self,
        pdf_bytes: bytes,
        format: str,
        dpi: int = 300
    ) -> bytes:
        """
        Convert PDF to image format.
        Supports PNG, JPG, JPEG.
        """
        # Convert PDF to PIL Image
        images = convert_from_bytes(pdf_bytes, dpi=dpi)
        
        if not images:
            raise ValueError("Failed to convert PDF to image")
        
        # Get first page (certificate is single page)
        image = images[0]
        
        # Save to bytes
        output = io.BytesIO()
        
        if format.lower() in ['jpg', 'jpeg']:
            # Convert RGBA to RGB for JPEG
            if image.mode == 'RGBA':
                image = image.convert('RGB')
            image.save(output, format='JPEG', quality=95)
        else:
            image.save(output, format='PNG')
        
        return output.getvalue()


class StorageService:
    """Service for file storage operations"""
    
    def __init__(self):
        """Initialize storage directory"""
        self.storage_path = Path(settings.STORAGE_PATH)
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def _get_file_path(self, certificate_id: str, format: str) -> Path:
        """Generate file path for certificate"""
        date_prefix = datetime.now().strftime('%Y/%m/%d')
        dir_path = self.storage_path / date_prefix
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path / f"{certificate_id}.{format}"
    
    def save_file(
        self,
        file_bytes: bytes,
        certificate_id: str,
        format: str
    ) -> str:
        """
        Save file to storage.
        Returns relative path to file.
        """
        file_path = self._get_file_path(certificate_id, format)
        
        with open(file_path, 'wb') as f:
            f.write(file_bytes)
        
        # Return relative path for URL generation
        return str(file_path.relative_to(self.storage_path))
    
    def get_download_url(self, relative_path: str, base_url: str = "http://localhost:8000") -> str:
        """Generate download URL for file"""
        # In production: generate presigned S3 URL
        # Return full URL so frontend knows where to fetch from
        return f"{base_url}/downloads/{relative_path}"
    
    def file_exists(self, relative_path: str) -> bool:
        """Check if file exists"""
        return (self.storage_path / relative_path).exists()


class CertificateService:
    """Main service for certificate generation"""
    
    def __init__(self):
        self.rendering = RenderingService()
        self.storage = StorageService()
    
    async def check_certificate_id_exists(
        self,
        db: AsyncSession,
        certificate_id: str
    ) -> bool:
        """Check if certificate ID already exists"""
        stmt = select(Certificate).where(Certificate.certificate_id == certificate_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None
    
    async def generate_certificate(
        self,
        db: AsyncSession,
        template: Template,
        certificate_data: dict,
        output_formats: List[str],
        user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate certificate and return download URLs.
        """
        # Render HTML
        html_content = self.rendering.render_html(
            template.html_content,
            certificate_data
        )
        
        # Generate PDF
        pdf_bytes = self.rendering.render_pdf(html_content, template.css_content)
        
        download_urls = {}
        paths = {}
        
        cert_id = certificate_data['certificate_id']
        
        for fmt in output_formats:
            if fmt.lower() == 'pdf':
                file_bytes = pdf_bytes
            else:
                file_bytes = self.rendering.convert_to_image(pdf_bytes, fmt)
            
            # Save file
            relative_path = self.storage.save_file(file_bytes, cert_id, fmt)
            paths[fmt] = relative_path
            download_urls[fmt] = self.storage.get_download_url(relative_path)
        
        # Save certificate record
        user_uuid = uuid.UUID(user_id) if user_id else None
        
        certificate = Certificate(
            certificate_id=cert_id,
            user_id=user_uuid,
            template_id=template.id,
            certificate_data=certificate_data,
            pdf_path=paths.get('pdf'),
            png_path=paths.get('png'),
            jpg_path=paths.get('jpg') or paths.get('jpeg'),
            status='generated',
            generated_at=datetime.now(timezone.utc)
        )
        db.add(certificate)
        
        return download_urls

    async def generate_certificate_from_html(
        self,
        db: AsyncSession,
        template: Template,
        html_content: str,
        certificate_data: dict,
        output_formats: List[str],
        user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate certificate from pre-rendered HTML.
        Used for finalized previews with position/style overrides already applied.
        """
        # Generate PDF from provided HTML
        pdf_bytes = self.rendering.render_pdf(html_content, template.css_content)
        
        download_urls = {}
        paths = {}
        
        cert_id = certificate_data['certificate_id']
        
        for fmt in output_formats:
            if fmt.lower() == 'pdf':
                file_bytes = pdf_bytes
            else:
                file_bytes = self.rendering.convert_to_image(pdf_bytes, fmt)
            
            # Save file
            relative_path = self.storage.save_file(file_bytes, cert_id, fmt)
            paths[fmt] = relative_path
            download_urls[fmt] = self.storage.get_download_url(relative_path)
        
        # Save certificate record
        user_uuid = uuid.UUID(user_id) if user_id else None
        
        certificate = Certificate(
            certificate_id=cert_id,
            user_id=user_uuid,
            template_id=template.id,
            certificate_data=certificate_data,
            pdf_path=paths.get('pdf'),
            png_path=paths.get('png'),
            jpg_path=paths.get('jpg') or paths.get('jpeg'),
            status='generated',
            generated_at=datetime.now(timezone.utc)
        )
        db.add(certificate)
        
        return download_urls


# Singleton instances
rendering_service = RenderingService()
storage_service = StorageService()
certificate_service = CertificateService()
