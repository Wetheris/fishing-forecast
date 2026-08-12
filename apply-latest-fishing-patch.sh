#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/c/Users/Admin/repos/fishing-forecast"
DOWNLOADS_DIR="/c/Users/Admin/Downloads"

# Make sure we're running from the expected project directory.
CURRENT_UNIX_DIR="$(pwd)"
CURRENT_WINDOWS_DIR="$(pwd -W 2>/dev/null || true)"

if [[ "$CURRENT_UNIX_DIR" != "$PROJECT_DIR" && "$CURRENT_WINDOWS_DIR" != "C:\\Users\\Admin\\repos\\fishing-forecast" ]]; then
    echo "This script should be run from:"
    echo "  $PROJECT_DIR"
    echo
    echo "Current directory:"
    echo "  $CURRENT_UNIX_DIR"
    exit 1
fi

if [[ ! -d "$DOWNLOADS_DIR" ]]; then
    echo "Downloads folder not found:"
    echo "  $DOWNLOADS_DIR"
    exit 1
fi

LATEST_ZIP="$(
    find "$DOWNLOADS_DIR" -maxdepth 1 -type f -iname '*.zip' -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr \
    | head -n 1 \
    | cut -d' ' -f2-
)"

if [[ -z "${LATEST_ZIP:-}" ]]; then
    echo "No ZIP files found in:"
    echo "  $DOWNLOADS_DIR"
    exit 1
fi

echo
echo "Newest ZIP found:"
echo "  $(basename "$LATEST_ZIP")"
echo
echo "Path:"
echo "  $LATEST_ZIP"
echo
echo "Modified:"
stat -c "  %y" "$LATEST_ZIP" 2>/dev/null || true
echo
echo "Files in ZIP:"
unzip -Z1 "$LATEST_ZIP" | sed 's/^/  /'
echo

read -r -p "Apply this ZIP to the fishing-forecast project? [y/N] " ANSWER

case "$ANSWER" in
    y|Y|yes|YES)
        echo
        echo "Applying patch..."
        unzip -o "$LATEST_ZIP" -d "$PROJECT_DIR"
        echo
        echo "Done."
        echo

        if command -v git >/dev/null 2>&1; then
            echo "Git status:"
            git -C "$PROJECT_DIR" status --short
        fi
        ;;
    *)
        echo
        echo "Cancelled. Nothing was changed."
        ;;
esac
