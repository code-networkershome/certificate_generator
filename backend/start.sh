#!/bin/bash

# Render startup script for the backend
# Note: Render runs from /opt/render/project/src/backend

# Start the application with gunicorn
exec gunicorn main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
