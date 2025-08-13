#!/bin/bash

# Claude CLI Installation Script for Ubuntu Server
# This script installs Claude CLI using npm

echo "==================================="
echo "Claude CLI Installation for Server"
echo "==================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Run: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "     sudo apt-get install -y nodejs"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing Claude CLI globally..."
sudo npm install -g @anthropic-ai/claude-cli

# Check if installation was successful
if command -v claude &> /dev/null; then
    CLAUDE_PATH=$(which claude)
    echo "✅ Claude CLI installed successfully at: $CLAUDE_PATH"
    
    # Create symbolic link if needed
    if [ "$CLAUDE_PATH" != "/usr/local/bin/claude" ]; then
        echo "Creating symbolic link to /usr/local/bin/claude..."
        sudo ln -sf "$CLAUDE_PATH" /usr/local/bin/claude
        echo "✅ Symbolic link created"
    fi
    
    # Update the claude-webserver.sh script if it exists
    if [ -f ".server-local/claude-webserver.sh" ]; then
        echo "Updating claude-webserver.sh with correct path..."
        sed -i "s|/usr/local/bin/claude|$CLAUDE_PATH|g" .server-local/claude-webserver.sh
        echo "✅ Script updated"
    fi
    
    echo ""
    echo "==================================="
    echo "Installation complete!"
    echo "Claude CLI is available at: $CLAUDE_PATH"
    echo "==================================="
else
    echo "❌ Installation failed. Please check the error messages above."
    exit 1
fi