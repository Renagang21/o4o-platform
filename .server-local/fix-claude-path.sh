#!/bin/bash

# Quick fix script for Claude path issue
# This script finds Claude and updates the webserver script

echo "🔍 Finding Claude CLI installation..."

# Try to find claude in common locations
CLAUDE_PATH=""

# Check common paths
for path in /usr/local/bin/claude /usr/bin/claude ~/.volta/bin/claude ~/node_modules/.bin/claude ~/.npm-global/bin/claude; do
    if [ -f "$path" ]; then
        CLAUDE_PATH="$path"
        echo "✅ Found Claude at: $CLAUDE_PATH"
        break
    fi
done

# If not found in common paths, use which command
if [ -z "$CLAUDE_PATH" ]; then
    if command -v claude &> /dev/null; then
        CLAUDE_PATH=$(which claude)
        echo "✅ Found Claude at: $CLAUDE_PATH"
    else
        echo "❌ Claude CLI not found. Please install it first."
        echo "Run: ./install-claude-cli.sh"
        exit 1
    fi
fi

# Update claude-webserver.sh if it exists
WEBSERVER_SCRIPT=".server-local/claude-webserver.sh"
if [ -f "$WEBSERVER_SCRIPT" ]; then
    echo "📝 Updating $WEBSERVER_SCRIPT..."
    
    # Backup the original file
    cp "$WEBSERVER_SCRIPT" "${WEBSERVER_SCRIPT}.backup"
    
    # Replace the claude path
    sed -i "s|/usr/local/bin/claude|$CLAUDE_PATH|g" "$WEBSERVER_SCRIPT"
    
    echo "✅ Script updated successfully"
    echo ""
    echo "You can now run: $WEBSERVER_SCRIPT"
else
    echo "⚠️  claude-webserver.sh not found at $WEBSERVER_SCRIPT"
    echo "Creating a new one..."
    
    mkdir -p .server-local
    cat > "$WEBSERVER_SCRIPT" << 'EOF'
#!/bin/bash

# Claude Web Server Script
# Auto-generated script with correct Claude path

CLAUDE_PATH="CLAUDE_PATH_PLACEHOLDER"

if [ ! -f "$CLAUDE_PATH" ]; then
    echo "❌ Claude not found at: $CLAUDE_PATH"
    echo "Please run: ./install-claude-cli.sh"
    exit 1
fi

echo "Starting Claude web server..."
$CLAUDE_PATH serve --port 8080 --host 0.0.0.0
EOF
    
    # Replace placeholder with actual path
    sed -i "s|CLAUDE_PATH_PLACEHOLDER|$CLAUDE_PATH|g" "$WEBSERVER_SCRIPT"
    chmod +x "$WEBSERVER_SCRIPT"
    
    echo "✅ Created new claude-webserver.sh with correct path"
fi

echo ""
echo "==================================="
echo "Setup complete!"
echo "Claude CLI path: $CLAUDE_PATH"
echo "==================================="