#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 --daemon --pid api.pid api:app
echo "giddy-up http://localhost:5000"
