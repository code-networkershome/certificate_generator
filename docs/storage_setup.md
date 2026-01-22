# Storage Setup Guide

This guide explains how to configure storage for the Certificate Generation System.

## Storage Options

The system supports three storage types:

1. **Local Storage** (default) - Files stored on server filesystem
2. **Supabase Storage** (recommended for production) - Files stored in Supabase Storage buckets
3. **S3 Storage** (planned) - Files stored in AWS S3 or compatible storage

---

## Option 1: Local Storage (Default)

### Configuration

Set in `.env` or environment variables:

```env
STORAGE_TYPE=local
STORAGE_PATH=./storage
```

### How It Works

- Files are saved to `./storage/YYYY/MM/DD/certificate_id.pdf`
- FastAPI serves files via static file mounting:
  - `/downloads/` → serves certificate files
  - `/storage/uploads/` → serves uploaded logos/signatures
- URLs: `http://localhost:8000/downloads/2026/01/22/NH-2026-00123.pdf`

### Pros
- ✅ Simple setup
- ✅ No external dependencies
- ✅ Good for development

### Cons
- ❌ Not scalable (server disk space)
- ❌ Files lost if server restarts (unless using volumes)
- ❌ No CDN benefits
- ❌ Not suitable for production

---

## Option 2: Supabase Storage (Recommended)

### Prerequisites

1. **Supabase Project** - Create at [supabase.com](https://supabase.com)
2. **Storage Bucket** - Create a bucket named `certificates` (or configure custom name)
3. **Service Role Key** - Get from Supabase Dashboard → Settings → API

### Step 1: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `certificates`
4. **Public bucket**: ✅ Enable (for public certificate downloads)
   - OR keep private and use signed URLs (more secure)

### Step 2: Configure Environment Variables

Add to `.env`:

```env
# Storage Configuration
STORAGE_TYPE=supabase
SUPABASE_STORAGE_BUCKET=certificates

# Supabase Credentials (already configured for auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Install Dependencies

```bash
pip install supabase
```

### Step 4: Update Bucket Policies (Optional)

If using a **private bucket**, configure RLS policies in Supabase Dashboard:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Allow public downloads (or restrict to authenticated)
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');
```

### How It Works

- Files uploaded to Supabase Storage bucket
- URLs generated automatically:
  - **Public bucket**: `https://[project].supabase.co/storage/v1/object/public/certificates/2026/01/22/cert.pdf`
  - **Private bucket**: Signed URLs (expire after 1 hour)

### Pros
- ✅ Scalable (unlimited storage)
- ✅ CDN included
- ✅ Integrated with Supabase Auth
- ✅ Automatic backups
- ✅ Production-ready

### Cons
- ⚠️ Requires Supabase account
- ⚠️ Free tier has limits (1GB storage)

---

## Migration: Local → Supabase Storage

### Step 1: Install Supabase CLI (Optional)

```bash
npm install -g supabase
```

### Step 2: Upload Existing Files

Create a migration script `migrate_storage.py`:

```python
import os
from pathlib import Path
from supabase import create_client
from config import get_settings

settings = get_settings()
supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

bucket_name = settings.SUPABASE_STORAGE_BUCKET or "certificates"
storage_path = Path(settings.STORAGE_PATH)

# Upload all files from local storage
for file_path in storage_path.rglob("*"):
    if file_path.is_file():
        relative_path = str(file_path.relative_to(storage_path))
        print(f"Uploading {relative_path}...")
        
        with open(file_path, 'rb') as f:
            supabase.storage.from_(bucket_name).upload(
                path=relative_path,
                file=f.read(),
                file_options={"upsert": "true"}  # Overwrite if exists
            )

print("Migration complete!")
```

Run: `python migrate_storage.py`

---

## Testing Storage Configuration

### Test Local Storage

```bash
# Generate a certificate
curl -X POST http://localhost:8000/certificate/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "...",
    "certificate_data": {...},
    "output_formats": ["pdf"]
  }'

# Check file exists
ls -la storage/2026/01/22/
```

### Test Supabase Storage

1. Generate a certificate (same API call)
2. Check Supabase Dashboard → Storage → `certificates` bucket
3. Verify file appears in bucket
4. Test download URL in browser

---

## Troubleshooting

### Issue: "supabase package not installed"

**Solution:**
```bash
pip install supabase
```

### Issue: "Failed to upload to Supabase Storage"

**Check:**
1. ✅ `SUPABASE_URL` is correct
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key!)
3. ✅ Bucket exists and is accessible
4. ✅ Service role key has storage permissions

### Issue: "File not found" when accessing URLs

**For Local Storage:**
- Check `STORAGE_PATH` is correct
- Verify FastAPI static file mounting in `main.py`
- Check file permissions

**For Supabase Storage:**
- Verify bucket is public OR RLS policies allow access
- Check URL format matches Supabase Storage URL pattern

---

## Production Recommendations

1. **Use Supabase Storage** for production
2. **Keep bucket private** and use signed URLs for security
3. **Set up CORS** in Supabase Dashboard if needed
4. **Monitor storage usage** in Supabase Dashboard
5. **Backup strategy**: Supabase handles backups automatically

---

## Environment Variables Reference

```env
# Storage Type: "local" | "supabase" | "s3"
STORAGE_TYPE=supabase

# Local Storage (only if STORAGE_TYPE=local)
STORAGE_PATH=./storage

# Supabase Storage (only if STORAGE_TYPE=supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=certificates

# S3 Storage (only if STORAGE_TYPE=s3) - Not yet implemented
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com
```
