"""
Quick test script to verify Supabase Storage connection.
Run this locally or add as a health check endpoint.
"""
import os
from supabase import create_client
from config import get_settings

settings = get_settings()

def test_supabase_storage():
    """Test Supabase Storage connection and bucket access"""
    try:
        print("Testing Supabase Storage connection...")
        print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
        print(f"STORAGE_TYPE: {settings.STORAGE_TYPE}")
        print(f"BUCKET: {settings.SUPABASE_STORAGE_BUCKET}")
        
        if settings.STORAGE_TYPE != "supabase":
            print("❌ STORAGE_TYPE is not set to 'supabase'")
            return False
        
        if not settings.SUPABASE_URL:
            print("❌ SUPABASE_URL is not set")
            return False
        
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            print("❌ SUPABASE_SERVICE_ROLE_KEY is not set")
            return False
        
        # Create client
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        
        bucket_name = settings.SUPABASE_STORAGE_BUCKET or "certificates"
        
        # Test: List files in bucket (or create if empty)
        try:
            files = supabase.storage.from_(bucket_name).list()
            print(f"✅ Successfully connected to bucket '{bucket_name}'")
            print(f"   Found {len(files)} files in bucket")
            return True
        except Exception as e:
            print(f"❌ Failed to access bucket: {str(e)}")
            print("   Make sure:")
            print("   1. Bucket exists in Supabase Dashboard")
            print("   2. Bucket is public OR RLS policies allow access")
            print("   3. Service role key has correct permissions")
            return False
            
    except ImportError:
        print("❌ supabase package not installed")
        print("   Run: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_supabase_storage()
    exit(0 if success else 1)
