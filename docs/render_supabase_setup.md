# Render + Supabase Storage Setup Checklist

## ✅ Step-by-Step Setup

### 1. Verify Environment Variables in Render

Go to **Render Dashboard → Your Service → Environment** and ensure these are set:

```env
# Storage Configuration
STORAGE_TYPE=supabase
SUPABASE_STORAGE_BUCKET=certificates

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database (your existing Render PostgreSQL)
DATABASE_URL=postgresql://certificate_builder_user:...@a.singapore-postgres.render.com/certificate_builder

# Other settings
CORS_ORIGINS=your-frontend-url
TEMPLATES_PATH=/app/templates
STORAGE_PATH=/app/storage  # (not used if STORAGE_TYPE=supabase, but keep it)
```

**⚠️ Important:**
- Use **Service Role Key**, NOT the anon key
- Get it from: Supabase Dashboard → Settings → API → `service_role` key
- The service role key has full access - keep it secret!

---

### 2. Verify Supabase Bucket Configuration

In **Supabase Dashboard → Storage**:

1. ✅ Bucket exists: `certificates` (or your configured name)
2. ✅ Bucket is **Public** (recommended for certificates)
   - OR configure RLS policies if you want private buckets

**To make bucket public:**
- Go to Storage → Your bucket → Settings
- Toggle "Public bucket" to ON

**For private buckets (with RLS):**
```sql
-- Allow service role full access
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

-- Allow public downloads
CREATE POLICY "Public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');
```

---

### 3. Deploy/Redeploy on Render

The code changes are already in your repository. You need to:

**Option A: Manual Deploy**
1. Go to Render Dashboard → Your Service
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete

**Option B: Auto Deploy (if connected to Git)**
- Push any commit to trigger auto-deploy
- Or just wait for the next auto-deploy

**What happens:**
- Render will install `supabase>=2.0.0` from `requirements.txt`
- Backend will initialize Supabase Storage client on startup
- Storage operations will use Supabase instead of local filesystem

---

### 4. Test Storage Connection

After deployment, test the connection:

**Option A: Health Check Endpoint**
```bash
curl https://your-render-service.onrender.com/health/storage
```

Expected response:
```json
{
  "status": "healthy",
  "storage_type": "supabase",
  "bucket": "certificates",
  "connected": true
}
```

**Option B: Generate a Test Certificate**
1. Use your frontend or API
2. Generate a certificate
3. Check Supabase Dashboard → Storage → `certificates` bucket
4. You should see the file: `2026/01/22/certificate_id.pdf`

**Option C: Check Logs**
- Render Dashboard → Your Service → Logs
- Look for any Supabase connection errors
- Should see successful storage operations

---

### 5. Verify File URLs

After generating a certificate, check the download URL:

**For Public Bucket:**
```
https://your-project.supabase.co/storage/v1/object/public/certificates/2026/01/22/NH-2026-00123.pdf
```

**For Private Bucket:**
- URLs will be signed URLs (expire after 1 hour)
- Format: `https://your-project.supabase.co/storage/v1/object/sign/certificates/...?token=...`

---

## 🔍 Troubleshooting

### Issue: "supabase package not installed"

**Solution:**
- Check `requirements.txt` includes `supabase>=2.0.0`
- Redeploy on Render
- Check deployment logs for pip install errors

### Issue: "Failed to upload to Supabase Storage"

**Check:**
1. ✅ `STORAGE_TYPE=supabase` (not "local")
2. ✅ `SUPABASE_URL` is correct (no trailing slash)
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` is the service role key (not anon key)
4. ✅ Bucket exists in Supabase Dashboard
5. ✅ Bucket is public OR RLS policies allow service role access

**Test manually:**
```python
from supabase import create_client

supabase = create_client(
    "https://your-project.supabase.co",
    "your-service-role-key"
)

# Test upload
supabase.storage.from_("certificates").upload(
    path="test.txt",
    file=b"test content"
)
```

### Issue: "Bucket not found" or "Access denied"

**Solutions:**
1. Verify bucket name matches `SUPABASE_STORAGE_BUCKET`
2. Make bucket public (easiest)
3. Or configure RLS policies (see step 2)

### Issue: Files not appearing in Supabase Dashboard

**Check:**
1. Wait a few seconds (Supabase UI may have delay)
2. Refresh the Storage page
3. Check Render logs for upload errors
4. Verify the file path format: `YYYY/MM/DD/certificate_id.pdf`

---

## 📊 Monitoring

### Check Storage Usage

- Supabase Dashboard → Storage → `certificates` bucket
- View file count and total size
- Free tier: 1GB storage

### Check Render Logs

- Render Dashboard → Your Service → Logs
- Look for storage-related errors
- Search for "Supabase" or "storage"

---

## 🎯 Next Steps

1. ✅ **Test certificate generation** - Generate a test certificate
2. ✅ **Verify file URLs** - Check download URLs work
3. ✅ **Test bulk generation** - Generate multiple certificates
4. ✅ **Monitor storage** - Check Supabase Dashboard for file count

---

## 📝 Summary

Your setup should now be:
- ✅ **Database**: Render PostgreSQL (existing)
- ✅ **Storage**: Supabase Storage (new)
- ✅ **Auth**: Supabase Auth (existing)
- ✅ **Backend**: Render (existing)

All certificate files will now be stored in Supabase Storage instead of the local filesystem!
