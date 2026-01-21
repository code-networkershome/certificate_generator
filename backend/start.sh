#!/bin/bash

# Render startup script for the backend
cd /app

# Run database migrations (if any)
# python -c "from database import init_db; import asyncio; asyncio.run(init_db())"

# Start the application with gunicorn
exec gunicorn main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
