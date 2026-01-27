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
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import unquote
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

    def render_pdf(self, html_content: str, css_content: str = None) -> bytes:
        """
        Render HTML content to PDF using WeasyPrint.
        """
        try:
            from weasyprint import HTML, CSS
            html = HTML(string=html_content)
            stylesheets = []
            if css_content:
                stylesheets.append(CSS(string=css_content))
            return html.write_pdf(stylesheets=stylesheets, presentational_hints=True)
        except Exception as e:
            error_str = str(e)
            print(f"CRITICAL ERROR: PDF generation failed: {error_str}")
            raise HTTPException(
                status_code=500, 
                detail=f"PDF generation failed: {error_str}. Ensure system dependencies (libpango, libcairo, etc.) are installed."
            )
    
    def convert_to_image(self, pdf_bytes: bytes, format: str, dpi: int = 300) -> bytes:
        """
        Convert PDF to image format.
        """
        try:
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(pdf_bytes, dpi=dpi)
            if not images:
                raise ValueError("Failed to convert PDF to image: No images returned from converter")
            
            image = images[0]
            output = io.BytesIO()
            if format.lower() in ['jpg', 'jpeg']:
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(output, format='JPEG', quality=95)
            else:
                image.save(output, format='PNG')
            return output.getvalue()
        except Exception as e:
            error_str = str(e)
            print(f"CRITICAL ERROR: Image conversion failed: {error_str}")
            raise HTTPException(
                status_code=500, 
                detail=f"Image conversion failed: {error_str}. Ensure poppler-utils is installed."
            )


class StorageService:
    """Service for file storage operations"""
    
    def __init__(self):
        """Initialize storage directory or Supabase client"""
        self.storage_type = settings.STORAGE_TYPE
        
        if self.storage_type == "supabase":
            # Initialize Supabase Storage client
            try:
                from supabase import create_client, Client
                if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
                    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Supabase storage")
                self.supabase: Client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
                self.bucket_name = settings.SUPABASE_STORAGE_BUCKET or "certificates"
            except ImportError:
                raise ImportError("supabase package not installed. Run: pip install supabase")
        else:
            # Local storage
            self.storage_path = Path(settings.STORAGE_PATH)
            self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def _get_file_path(self, certificate_id: str, format: str) -> str:
        """Generate file path for certificate (relative path)"""
        date_prefix = datetime.now().strftime('%Y/%m/%d')
        return f"{date_prefix}/{certificate_id}.{format}"
    
    def save_file(
        self,
        file_bytes: bytes,
        certificate_id: str,
        format: str
    ) -> str:
        """
        Save file to storage (local or Supabase).
        Returns relative path to file.
        """
        relative_path = self._get_file_path(certificate_id, format)
        
        if self.storage_type == "supabase":
            # Upload to Supabase Storage
            try:
                # Upload file to Supabase Storage bucket
                response = self.supabase.storage.from_(self.bucket_name).upload(
                    path=relative_path,
                    file=file_bytes,
                    file_options={"content-type": self._get_content_type(format)}
                )
                # Supabase returns the path
                return relative_path
            except Exception as e:
                raise Exception(f"Failed to upload to Supabase Storage: {str(e)}")
        else:
            # Local storage
            file_path = self.storage_path / relative_path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(file_bytes)
            
            return relative_path
    
    def _get_content_type(self, format: str) -> str:
        """Get content type for file format"""
        content_types = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg'
        }
        return content_types.get(format.lower(), 'application/octet-stream')
    
    def get_download_url(self, relative_path: str, base_url: str = "http://localhost:8000") -> str:
        """Generate download URL for file"""
        if self.storage_type == "supabase":
            # Get public URL from Supabase Storage
            try:
                # In most supabase-py versions, get_public_url returns a string
                # but in some it returns an object with a .url attribute
                url = self.supabase.storage.from_(self.bucket_name).get_public_url(relative_path)
                if hasattr(url, 'public_url'):
                    return url.public_url
                if isinstance(url, dict) and 'publicURL' in url:
                    return url['publicURL']
                return str(url)
            except Exception as e:
                print(f"Failed to get public URL: {e}")
                # Fallback: try to create signed URL for private buckets
                try:
                    # Create signed URL (valid for 1 hour)
                    signed_response = self.supabase.storage.from_(self.bucket_name).create_signed_url(
                        path=relative_path,
                        expires_in=3600
                    )
                    if isinstance(signed_response, dict):
                        return signed_response.get('signedURL', '')
                    if hasattr(signed_response, 'signed_url'):
                        return signed_response.signed_url
                    return str(signed_response)
                except:
                    raise Exception(f"Failed to get download URL from Supabase")
        else:
            # Local storage - return relative URL
            return f"{base_url}/downloads/{relative_path}"
    
    def file_exists(self, relative_path: str) -> bool:
        """Check if file exists"""
        if self.storage_type == "supabase":
            try:
                # List files in the path to check existence
                path_parts = relative_path.split('/')
                folder_path = '/'.join(path_parts[:-1]) if len(path_parts) > 1 else ''
                file_name = path_parts[-1]
                
                files = self.supabase.storage.from_(self.bucket_name).list(folder_path)
                return any(f['name'] == file_name for f in files)
            except:
                return False
        else:
            return (self.storage_path / relative_path).exists()

    def get_file(self, relative_path: str) -> bytes:
        """Get file bytes from storage"""
        if self.storage_type == "supabase":
            try:
                response = self.supabase.storage.from_(self.bucket_name).download(relative_path)
                return response
            except Exception as e:
                raise Exception(f"Failed to download from Supabase: {str(e)}")
        else:
            file_path = self.storage_path / relative_path
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            with open(file_path, 'rb') as f:
                return f.read()

    def _get_relative_path_from_url(self, url: str) -> Optional[str]:
        """Extract relative path from a download URL"""
        if not url:
            return None
            
        if self.storage_type == "supabase":
            if '/public/' in url:
                # https://.../public/certificates/2026/01/27/cert.pdf
                path = unquote(url.split('/public/')[-1])
                if path.startswith(self.bucket_name + "/"):
                    return path[len(self.bucket_name)+1:]
                return path
            elif '/sign/' in url:
                # Handle signed URLs if needed
                path = unquote(url.split('?')[0].split('/')[-1])
                return path
            return None
        else:
            # Local: http://localhost:8000/downloads/2026/01/27/cert.pdf
            if '/downloads/' in url:
                return unquote(url.split('/downloads/')[-1])
            return None


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
