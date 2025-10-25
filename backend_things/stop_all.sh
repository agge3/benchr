#!/bin/bash
cd "$(dirname "$0")"
if [ -f api.pid ]; then
    kill $(cat api.pid) 2>/dev/null
    rm api.pid
    echo "API bad"
fi
