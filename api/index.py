import os
import sys
from pathlib import Path

# Add the 'backend' directory to sys.path so that imports within main.py work
# (e.g., 'from routers import ...')
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.append(str(backend_dir))

# Also add the root to sys.path if needed
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.append(str(root_dir))

# Import the FastAPI app from backend.main
try:
    from main import app
except ImportError:
    # Fallback in case of different path resolution
    from backend.main import app

# Vercel needs the app object to be named 'app'
# This file serves as the serverless function entry point
