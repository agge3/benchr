#!/bin/bash

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------

# Use the first argument as the base path, or default to current directory "."
BASE_PATH="${1:-.}"

# List of subdirectories to search in
# (Relative to the BASE_PATH)
SUBDIRS=(
    "setup"
    "vm"
    "mnt"
    "data"
    "logs"
    ".venv"
    ".ruff_cache"
    "tests"
    ".github"
    ".gitignore"
    ".gitmodules"
    "package.json"
    "package-lock.json"
    "pytest.ini"
    "README.md"
    "frontend"
)

# ---------------------------------------------------------
# SETUP
# ---------------------------------------------------------

# Check for dry-run argument (scan for -n or --dry-run anywhere in args)
DRY_RUN=false
if [[ "$*" == *"--dry-run"* ]] || [[ "$*" == *"-n"* ]]; then
    DRY_RUN=true
    echo "--- DRY RUN MODE: No files will be modified ---"
fi

# Initialize counters
SUCCESS_COUNT=0
FILES_TO_PROCESS=()

# ---------------------------------------------------------
# 1. Find the files
# ---------------------------------------------------------
echo "Scanning for C/H files in: $BASE_PATH"

# First, check if the BASE_PATH itself exists
if [[ ! -d "$BASE_PATH" ]]; then
    echo "Error: file not found" >&2
    exit 1
fi

for subdir in "${SUBDIRS[@]}"; do
    # Remove trailing slash from BASE_PATH if present to avoid //
    full_path="${BASE_PATH%/}/$subdir"

    if [[ -d "$full_path" ]]; then
        while IFS= read -r file; do
            FILES_TO_PROCESS+=("$file")
        done < <(find "$full_path" -type f \( -name "*.c" -o -name "*.h" \))
    else
        # Only warn if not in dry run, or keep it to show what's missing
        echo "Warning: Directory not found: $full_path"
    fi
done

TOTAL_FILES=${#FILES_TO_PROCESS[@]}

if [[ "$TOTAL_FILES" -eq 0 ]]; then
    echo "No files found. Please check your path."
    exit 0
fi

echo "Found $TOTAL_FILES files to process"

# ---------------------------------------------------------
# 2. Process files
# ---------------------------------------------------------

for file_path in "${FILES_TO_PROCESS[@]}"; do

    if [[ "$DRY_RUN" = true ]]; then
        echo "[Dry Run] Would process: $file_path"
        ((SUCCESS_COUNT++))
        continue
    fi

    # Perl logic:
    # 1. Match Strings (keep them)
    # 2. Match Comments (remove them)
    # 3. Clean up excessive newlines

    perl -0777 -i -pe '
        s{
            # Match Strings (Double or Single quoted) to preserve them
            (
                "[^"\\]*(?:\\.[^"\\]*)*"
                |
                \x27[^\x27\\]*(?:\\.[^\x27\\]*)*\x27
            )
            |
            # Match Comments (Single or Multi-line) to delete them
            (?:
                //[^\n]* |
                /\*.*?\*/
            )
        }{
            defined $1 ? $1 : ""
        }xgse;

        # Clean up excessive newlines
        s/\n\s*\n\s*\n+/\n\n/g;
    ' "$file_path"

    if [[ $? -eq 0 ]]; then
        echo "Processed: $file_path"
        ((SUCCESS_COUNT++))
    else
        echo "Error processing $file_path" >&2
    fi
done

if [[ "$DRY_RUN" = true ]]; then
    echo -e "\nDry run complete. $SUCCESS_COUNT files identified."
else
    echo -e "\nProcessed $SUCCESS_COUNT/$TOTAL_FILES files successfully"
fi
