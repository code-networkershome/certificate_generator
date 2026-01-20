# Certificate Rendering Pipeline

## Overview

This document describes the step-by-step process for rendering certificates from JSON input to downloadable files.

---

## Pipeline Steps

### Step 1: Receive JSON Input

**Input**: JSON object or array from API request

```json
{
  "student_name": "John Doe",
  "course_name": "AWS Cloud Practitioner",
  "issue_date": "2026-01-20",
  "certificate_id": "NH-2026-00123",
  "issuing_authority": "NetworkersHome",
  "signature_name": "Director",
  "signature_image_url": "https://example.com/sign.png",
  "logo_url": "https://example.com/logo.png"
}
```

---

### Step 2: Validate Input

**Library**: `jsonschema` (Python)

```python
from jsonschema import validate, ValidationError
import json

with open('schemas/certificate_schema.json') as f:
    schema = json.load(f)

try:
    validate(instance=certificate_data, schema=schema)
except ValidationError as e:
    raise HTTPException(400, f"Validation error: {e.message}")
```

**Validations performed**:
- Required fields present
- Data types correct
- URL format valid
- Date format valid (YYYY-MM-DD)

---

### Step 3: Load Template

**Source**: Database `templates` table or filesystem

```python
async def load_template(template_id: str) -> Template:
    template = await db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    return template
```

---

### Step 4: Inject Values into Template

**Library**: `jinja2` (Python)

```python
from jinja2 import Template

def render_template(html_content: str, data: dict) -> str:
    template = Template(html_content)
    
    # Prepare data with image handling
    render_data = {
        **data,
        'logo_image': data.get('logo_url'),
        'signature_image': data.get('signature_image_url')
    }
    
    return template.render(**render_data)
```

**Placeholders replaced**:
- `{{student_name}}`
- `{{course_name}}`
- `{{issue_date}}`
- `{{certificate_id}}`
- `{{issuing_authority}}`
- `{{signature_name}}`
- `{{signature_image}}`
- `{{logo_image}}`

---

### Step 5: Render HTML to PDF

**Library**: `WeasyPrint`

```python
from weasyprint import HTML, CSS

def render_pdf(html_content: str, css_content: str = None) -> bytes:
    html = HTML(string=html_content)
    
    stylesheets = []
    if css_content:
        stylesheets.append(CSS(string=css_content))
    
    # Render with 300 DPI for print quality
    pdf_bytes = html.write_pdf(
        stylesheets=stylesheets,
        presentational_hints=True
    )
    
    return pdf_bytes
```

**WeasyPrint configuration**:
- Supports @page rules for A4 sizing
- Handles embedded fonts
- Preserves print-quality colors
- Outputs vector-based PDF

---

### Step 6: Convert PDF to Images

**Library**: `pdf2image` (uses Poppler)

```python
from pdf2image import convert_from_bytes
from PIL import Image
import io

def convert_to_image(pdf_bytes: bytes, format: str, dpi: int = 300) -> bytes:
    # Convert PDF to PIL Image
    images = convert_from_bytes(pdf_bytes, dpi=dpi)
    
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
```

**Image specifications**:
- Resolution: 300 DPI
- PNG: Lossless, RGBA support
- JPG/JPEG: 95% quality, RGB

---

### Step 7: Store Files

**Options**: Local filesystem, MinIO, AWS S3

```python
import boto3
from datetime import datetime

async def store_file(
    file_bytes: bytes,
    certificate_id: str,
    format: str,
    bucket: str = "certificates"
) -> str:
    s3_client = boto3.client('s3')
    
    # Generate unique key
    date_prefix = datetime.now().strftime('%Y/%m/%d')
    key = f"{date_prefix}/{certificate_id}.{format}"
    
    # Upload file
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=file_bytes,
        ContentType=get_content_type(format)
    )
    
    # Generate presigned URL (valid for 24 hours)
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=86400
    )
    
    return url

def get_content_type(format: str) -> str:
    types = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg'
    }
    return types.get(format, 'application/octet-stream')
```

---

### Step 8: Return Download URL

**Response structure**:

```json
{
  "success": true,
  "certificate_id": "NH-2026-00123",
  "download_urls": {
    "pdf": "https://storage.example.com/certificates/2026/01/20/NH-2026-00123.pdf",
    "png": "https://storage.example.com/certificates/2026/01/20/NH-2026-00123.png"
  },
  "generated_at": "2026-01-20T12:00:00Z"
}
```

---

## Complete Pipeline Function

```python
async def generate_certificate(
    template_id: str,
    certificate_data: CertificateInput,
    output_formats: List[OutputFormat],
    user_id: str
) -> GenerateCertificateResponse:
    
    # Step 2: Validate (Pydantic already validated)
    
    # Step 3: Load template
    template = await load_template(template_id)
    
    # Step 4: Render HTML
    html_content = render_template(
        template.html_content,
        certificate_data.dict()
    )
    
    # Step 5: Generate PDF
    pdf_bytes = render_pdf(html_content, template.css_content)
    
    download_urls = {}
    
    for fmt in output_formats:
        if fmt == OutputFormat.PDF:
            file_bytes = pdf_bytes
        else:
            # Step 6: Convert to image
            file_bytes = convert_to_image(pdf_bytes, fmt.value)
        
        # Step 7: Store file
        url = await store_file(
            file_bytes,
            certificate_data.certificate_id,
            fmt.value
        )
        download_urls[fmt.value] = url
    
    # Save to database
    await save_certificate_record(
        user_id=user_id,
        template_id=template_id,
        certificate_data=certificate_data.dict(),
        download_urls=download_urls
    )
    
    # Step 8: Return response
    return GenerateCertificateResponse(
        success=True,
        certificate_id=certificate_data.certificate_id,
        download_urls=download_urls,
        generated_at=datetime.now(timezone.utc)
    )
```

---

## Error Handling

| Error | HTTP Code | Handling |
|-------|-----------|----------|
| Invalid JSON | 400 | Return validation errors |
| Template not found | 404 | Return "Template not found" |
| Duplicate certificate_id | 409 | Return "Certificate ID exists" |
| Rendering failure | 500 | Log error, return generic message |
| Storage failure | 500 | Retry with backoff, then fail |

---

## Performance Considerations

1. **Template Caching**: Cache parsed templates in memory
2. **Connection Pooling**: Use connection pools for DB and storage
3. **Async Processing**: Use async for I/O-bound operations
4. **Bulk Processing**: Process bulk requests in parallel with limits
5. **Background Jobs**: For large bulk requests, use Celery/RQ
