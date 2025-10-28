#!/bin/bash
# Flip symlinks to point to /var/www/benchr/

# Array of filenames
files=(api.py config.py IQueue.py job_cache.py migrate.py models.py util.py wsgi.py)

# Remove existing files or symlinks
for f in "${files[@]}"; do
    if [ -e "$f" ] || [ -L "$f" ]; then
        rm -f "$f"
        echo "Removed $f"
    fi
done

# Create new symlinks pointing to /var/www/benchr/
declare -A targets=(
    [wsgi.py]="/var/www/benchr/wsgi.py"
    [util.py]="/var/www/benchr/util.py"
    [models.py]="/var/www/benchr/models.py"
    [migrate.py]="/var/www/benchr/migrate.py"
    [job_cache.py]="/var/www/benchr/job_cache.py"
    [config.py]="/var/www/benchr/config.py"
    [api.py]="/var/www/benchr/api.py"
    [IQueue.py]="/var/www/benchr/IQueue.py"
)

for f in "${!targets[@]}"; do
    ln -s "${targets[$f]}" "$f"
    echo "Created symlink $f -> ${targets[$f]}"
done
