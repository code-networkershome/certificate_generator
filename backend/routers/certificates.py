"""
Certificates Router - Certificate generation endpoints
"""

from datetime import datetime, timezone
from typing import List
import csv
import io
import random
import string
import zipfile
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import (
    GenerateCertificateRequest,
    GenerateCertificateResponse,
    BulkGenerateRequest,
    BulkGenerateResponse,
    BulkCertificateResult,
    CertificateInput,
    OutputFormat,
    PreviewCertificateRequest,
    PreviewResponse,
    FinalizePreviewRequest
)
from database import get_db
from db_models import Certificate
from dependencies import get_current_user
from services.certificate_service import certificate_service, rendering_service

router = APIRouter(prefix="/certificate", tags=["Certificates"])


async def generate_unique_certificate_id(db: AsyncSession) -> str:
    """Generate a unique certificate ID in format NH-YYYY-XXXXX."""
    year = datetime.now().year
    
    for _ in range(10):  # Try up to 10 times
        random_part = ''.join(random.choices(string.digits, k=5))
        cert_id = f"NH-{year}-{random_part}"
        
        # Check if exists
        result = await db.execute(
            select(Certificate).where(Certificate.certificate_id == cert_id)
        )
        if not result.scalar_one_or_none():
            return cert_id
    
    # Fallback with longer random
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"NH-{year}-{random_part}"


@router.post(
    "/generate",
    response_model=GenerateCertificateResponse,
    summary="Generate a single certificate",
    description="Generates a certificate from provided data and template."
)
async def generate_certificate(
    request: GenerateCertificateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> GenerateCertificateResponse:
    """Generate a single certificate."""
    
    # Auto-generate certificate ID if not provided
    cert_data = request.certificate_data.model_dump()
    if not cert_data.get('certificate_id'):
        cert_data['certificate_id'] = await generate_unique_certificate_id(db)
    else:
        # Check uniqueness if provided
        exists = await certificate_service.check_certificate_id_exists(
            db,
            cert_data['certificate_id']
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Certificate ID '{cert_data['certificate_id']}' already exists"
            )
    
    # Get template
    template = await rendering_service.get_template(db, request.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Generate certificate
    try:
        download_urls = await certificate_service.generate_certificate(
            db,
            template,
            cert_data,
            [fmt.value for fmt in request.output_formats],
            current_user
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Certificate generation failed: {str(e)}"
        )
    
    await db.commit()
    
    return GenerateCertificateResponse(
        success=True,
        certificate_id=cert_data['certificate_id'],
        download_urls=download_urls,
        generated_at=datetime.now(timezone.utc)
    )


@router.post(
    "/bulk-generate",
    response_model=BulkGenerateResponse,
    summary="Generate certificates in bulk",
    description="Generates multiple certificates from JSON array input."
)
async def bulk_generate_certificates(
    request: BulkGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> BulkGenerateResponse:
    """Generate multiple certificates in bulk."""
    
    # Get template
    template = await rendering_service.get_template(db, request.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    results: List[BulkCertificateResult] = []
    successful = 0
    failed = 0
    
    for cert_data in request.certificates:
        try:
            # Convert to dict for manipulation
            cert_dict = cert_data.model_dump()
            
            # Auto-generate certificate_id if not provided
            if not cert_dict.get('certificate_id'):
                cert_dict['certificate_id'] = await generate_unique_certificate_id(db)
            else:
                # Check uniqueness if provided
                exists = await certificate_service.check_certificate_id_exists(
                    db,
                    cert_dict['certificate_id']
                )
                if exists:
                    raise ValueError(f"Certificate ID already exists")
            
            # Generate
            download_urls = await certificate_service.generate_certificate(
                db,
                template,
                cert_dict,
                [fmt.value for fmt in request.output_formats],
                current_user
            )
            
            results.append(BulkCertificateResult(
                certificate_id=cert_dict['certificate_id'],
                success=True,
                download_urls=download_urls
            ))
            successful += 1
            
        except Exception as e:
            results.append(BulkCertificateResult(
                certificate_id=cert_dict.get('certificate_id') or 'UNKNOWN',
                success=False,
                error=str(e)
            ))
            failed += 1
    
    await db.commit()
    
    # Create ZIP of all successful certificates
    zip_url = None
    if successful > 0:
        # Create unique zip filename
        zip_filename = f"bulk-certificates-{uuid.uuid4().hex[:8]}.zip"
        zip_path = f"/app/storage/{zip_filename}"
        
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for result in results:
                    if result.success and result.download_urls:
                        for fmt, url in result.download_urls.items():
                            # URL is like: http://localhost:8000/downloads/2026/01/20/cert.pdf
                            # Extract the path after /downloads/
                            if '/downloads/' in url:
                                relative_path = url.split('/downloads/')[-1]
                                file_path = f"/app/storage/{relative_path}"
                            else:
                                # Fallback for relative URLs
                                file_path = f"/app/storage/{url.lstrip('/')}"
                            
                            print(f"ZIP: Looking for file at {file_path}")
                            if os.path.exists(file_path):
                                # Add to zip with meaningful name
                                arc_name = f"{result.certificate_id}.{fmt}"
                                zipf.write(file_path, arc_name)
                                print(f"ZIP: Added {arc_name}")
                            else:
                                print(f"ZIP: File not found at {file_path}")
            
            zip_url = f"/downloads/{zip_filename}"
        except Exception as e:
            # Log error but don't fail the response
            print(f"Error creating ZIP: {e}")
    
    return BulkGenerateResponse(
        success=failed == 0,
        total=len(request.certificates),
        successful=successful,
        failed=failed,
        results=results,
        zip_download_url=zip_url
    )


@router.post(
    "/bulk-generate/csv",
    response_model=BulkGenerateResponse,
    summary="Generate certificates from CSV upload",
    description="Upload a CSV file to generate multiple certificates."
)
async def bulk_generate_from_csv(
    template_id: str = Form(...),
    output_formats: str = Form("pdf"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> BulkGenerateResponse:
    """Generate certificates from uploaded CSV file."""
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    # Get template
    template = await rendering_service.get_template(db, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Parse output formats
    formats = [OutputFormat(f.strip()) for f in output_formats.split(',')]
    
    # Read CSV
    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(csv_file)
    
    # Required columns
    required_cols = ['student_name', 'course_name', 'issue_date', 'certificate_id', 'issuing_authority']
    
    results: List[BulkCertificateResult] = []
    successful = 0
    failed = 0
    
    for row in reader:
        try:
            # Validate required columns
            for col in required_cols:
                if col not in row or not row[col]:
                    raise ValueError(f"Missing required column: {col}")
            
            # Create certificate data
            cert_data = CertificateInput(
                student_name=row['student_name'],
                course_name=row['course_name'],
                issue_date=row['issue_date'],
                certificate_id=row['certificate_id'],
                issuing_authority=row['issuing_authority'],
                signature_name=row.get('signature_name'),
                signature_image_url=row.get('signature_image_url') or None,
                logo_url=row.get('logo_url') or None
            )
            
            # Check uniqueness
            exists = await certificate_service.check_certificate_id_exists(
                db,
                cert_data.certificate_id
            )
            if exists:
                raise ValueError("Certificate ID already exists")
            
            # Generate
            download_urls = await certificate_service.generate_certificate(
                db,
                template,
                cert_data.model_dump(),
                [fmt.value for fmt in formats],
                current_user
            )
            
            results.append(BulkCertificateResult(
                certificate_id=cert_data.certificate_id,
                success=True,
                download_urls=download_urls
            ))
            successful += 1
            
        except Exception as e:
            cert_id = row.get('certificate_id', 'unknown')
            results.append(BulkCertificateResult(
                certificate_id=cert_id,
                success=False,
                error=str(e)
            ))
            failed += 1
    
    await db.commit()
    
    return BulkGenerateResponse(
        success=failed == 0,
        total=successful + failed,
        successful=successful,
        failed=failed,
        results=results,
        zip_download_url="/downloads/bulk-certificates.zip" if successful > 0 else None
    )


@router.get(
    "/history",
    summary="Get certificate generation history",
    description="Returns a list of all certificates generated by the current user."
)
async def get_certificate_history(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get user's certificate generation history."""
    from db_models import User
    import uuid as uuid_module
    
    user = None
    
    # Try to find user by ID first (if current_user is a UUID)
    try:
        user_uuid = uuid_module.UUID(current_user)
        result = await db.execute(
            select(User).where(User.id == user_uuid)
        )
        user = result.scalar_one_or_none()
    except (ValueError, TypeError):
        pass
    
    # Fallback: try to find by email
    if not user:
        result = await db.execute(
            select(User).where(User.email == current_user)
        )
        user = result.scalar_one_or_none()
    
    if not user:
        return {"certificates": [], "total": 0}
    
    # Get certificates for user
    result = await db.execute(
        select(Certificate)
        .where(Certificate.user_id == user.id)
        .order_by(Certificate.created_at.desc())
    )
    certificates = result.scalars().all()
    
    # Get storage service for generating proper download URLs
    from services.certificate_service import storage_service
    
    history = []
    for cert in certificates:
        download_urls = {}
        if cert.pdf_path:
            download_urls["pdf"] = storage_service.get_download_url(cert.pdf_path)
        if cert.png_path:
            download_urls["png"] = storage_service.get_download_url(cert.png_path)
        if cert.jpg_path:
            download_urls["jpg"] = storage_service.get_download_url(cert.jpg_path)
        
        history.append({
            "id": str(cert.id),
            "certificate_id": cert.certificate_id,
            "student_name": cert.certificate_data.get("student_name", ""),
            "course_name": cert.certificate_data.get("course_name", ""),
            "issue_date": cert.certificate_data.get("issue_date", ""),
            "status": cert.status,
            "generated_at": cert.generated_at.isoformat() if cert.generated_at else None,
            "download_urls": download_urls
        })
    
    return {"certificates": history, "total": len(history)}


@router.post(
    "/preview",
    response_model=PreviewResponse,
    summary="Get certificate preview HTML",
    description="Returns rendered HTML for live preview editing without saving files."
)
async def preview_certificate(
    request: PreviewCertificateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> PreviewResponse:
    """Generate HTML preview for interactive editing."""
    
    # Get template
    template = await rendering_service.get_template(db, request.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Render HTML with current data
    html_content = rendering_service.render_html(
        template.html_content,
        request.certificate_data
    )
    
    # Inject position and style overrides if provided
    if request.element_positions or request.element_styles:
        html_content = _inject_editor_overrides(
            html_content,
            request.element_positions,
            request.element_styles
        )
    
    return PreviewResponse(
        html=html_content,
        template_id=str(template.id),
        template_name=template.name
    )


def _inject_editor_overrides(html: str, positions: list, styles: list) -> str:
    """
    Inject CSS overrides for element positions and styles.
    Also injects data-editable attributes into the HTML to make CSS selectors match.
    """
    import re
    
    # Collect all element IDs that need data-editable attributes
    element_ids = set()
    if positions:
        for pos in positions:
            element_ids.add(pos.element_id)
    if styles:
        for style in styles:
            element_ids.add(style.element_id)
    
    # Inject data-editable attributes into HTML elements
    # Map common class names to their IDs (based on frontend CertificateEditor.jsx patterns)
    class_to_id_map = {
        'recipient': 'recipient',
        'student-name': 'student-name',
        'course-name': 'course-name',
        'title': 'title',
        'subtitle': 'subtitle',
        'description': 'description',
        'date': 'date',
        'value': 'value',
        'certify-text': 'certify-text',
        'intro': 'intro',
        'body-text': 'body-text',
        'footer': 'footer',
        'signature': 'signature',
        'authority': 'authority',
    }
    
    modified_html = html
    
    # For each element ID we need to override, inject data-editable attribute
    for element_id in element_ids:
        # Try to find matching class and add data-editable
        # Handle class="element_id" pattern
        pattern = rf'class="([^"]*\b{re.escape(element_id)}\b[^"]*)"'
        match = re.search(pattern, modified_html)
        if match:
            original = match.group(0)
            new_attr = f'{original} data-editable="{element_id}"'
            modified_html = modified_html.replace(original, new_attr, 1)
        else:
            # Try with hyphenated version (recipient -> recipient)
            hyphenated = element_id.replace('_', '-')
            pattern = rf'class="([^"]*\b{re.escape(hyphenated)}\b[^"]*)"'
            match = re.search(pattern, modified_html)
            if match:
                original = match.group(0)
                new_attr = f'{original} data-editable="{element_id}"'
                modified_html = modified_html.replace(original, new_attr, 1)
    
    # Build CSS overrides
    override_css = "<style id='editor-overrides'>\n"
    
    if positions:
        for pos in positions:
            override_css += f"""
            [data-editable="{pos.element_id}"] {{
                position: absolute !important;
                left: {pos.x}px !important;
                top: {pos.y}px !important;
            }}
            """
    
    if styles:
        for style in styles:
            rules = []
            if style.font_size:
                rules.append(f"font-size: {style.font_size} !important")
            if style.color:
                rules.append(f"color: {style.color} !important")
            if style.font_weight:
                rules.append(f"font-weight: {style.font_weight} !important")
            if style.text_align:
                rules.append(f"text-align: {style.text_align} !important")
            
            if rules:
                override_css += f"""
                [data-editable="{style.element_id}"] {{
                    {"; ".join(rules)};
                }}
                """
    
    override_css += "</style>"
    
    # Inject CSS before closing </head> or at start of HTML
    if "</head>" in modified_html:
        modified_html = modified_html.replace("</head>", f"{override_css}\n</head>")
    else:
        modified_html = override_css + modified_html
    
    return modified_html


@router.post(
    "/finalize",
    response_model=GenerateCertificateResponse,
    summary="Finalize edited certificate",
    description="Generate final certificate files from edited preview data."
)
async def finalize_certificate(
    request: FinalizePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
) -> GenerateCertificateResponse:
    """Generate final certificate from edited preview."""
    
    # Auto-generate certificate ID if not provided
    cert_data = dict(request.certificate_data)
    if not cert_data.get('certificate_id'):
        cert_data['certificate_id'] = await generate_unique_certificate_id(db)
    else:
        # Check uniqueness if provided
        exists = await certificate_service.check_certificate_id_exists(
            db,
            cert_data['certificate_id']
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Certificate ID '{cert_data['certificate_id']}' already exists"
            )
    
    # Get template
    template = await rendering_service.get_template(db, request.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Generate certificate with position/style overrides
    try:
        # First render HTML with overrides
        html_content = rendering_service.render_html(
            template.html_content,
            cert_data
        )
        
        # Apply position and style overrides
        if request.element_positions or request.element_styles:
            html_content = _inject_editor_overrides(
                html_content,
                request.element_positions,
                request.element_styles
            )
        
        # Generate PDF from modified HTML
        download_urls = await certificate_service.generate_certificate_from_html(
            db,
            template,
            html_content,
            cert_data,
            [fmt.value for fmt in request.output_formats],
            current_user
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Certificate generation failed: {str(e)}"
        )
    
    await db.commit()
    
    return GenerateCertificateResponse(
        success=True,
        certificate_id=cert_data['certificate_id'],
        download_urls=download_urls,
        generated_at=datetime.now(timezone.utc)
    )
