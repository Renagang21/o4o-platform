#!/bin/bash
# Start Chrome with remote debugging for MCP

echo "Starting Chrome with remote debugging on port 9222..."
echo "This will open a NEW Chrome window (separate from your current session)"

# Find Chrome executable
CHROME_PATH=""
if [ -f "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" ]; then
    CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
elif [ -f "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" ]; then
    CHROME_PATH="/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
else
    echo "❌ Chrome not found in standard locations"
    exit 1
fi

# Create temp directory for debug profile
DEBUG_DIR="/tmp/chrome-debug-$$"
mkdir -p "$DEBUG_DIR"

# Start Chrome with remote debugging
"$CHROME_PATH" \
    --remote-debugging-port=9222 \
    --user-data-dir="$DEBUG_DIR" \
    --no-first-run \
    --no-default-browser-check \
    "http://localhost:5175/dashboard/seller" \
    > /dev/null 2>&1 &

CHROME_PID=$!

echo "✅ Chrome started (PID: $CHROME_PID)"
echo "📍 Remote debugging: http://localhost:9222"
echo "🌐 Opening: http://localhost:5175/dashboard/seller"
echo ""
echo "⚠️  This is a SEPARATE Chrome window for testing only"
echo "💡 Your current Chrome session is NOT affected"
echo ""
echo "To stop this Chrome instance:"
echo "  kill $CHROME_PID"
