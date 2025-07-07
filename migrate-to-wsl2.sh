#!/bin/bash
# Migration script to move o4o-platform to WSL2 Linux filesystem

echo "=== O4O Platform WSL2 Migration Script ==="
echo "This script will help you migrate your project to WSL2 Linux filesystem for better performance"
echo ""

# Navigate to home directory
cd ~

# Create projects directory if it doesn't exist
echo "1. Creating projects directory..."
mkdir -p ~/projects
cd ~/projects

# Clone the repository
echo "2. Cloning o4o-platform from GitHub..."
git clone https://github.com/Renagang21/o4o-platform.git

# Navigate to api-server
echo "3. Navigating to api-server..."
cd o4o-platform/services/api-server

# Install dependencies
echo "4. Installing dependencies..."
npm install

# Run type check
echo "5. Running type check..."
npm run type-check

# Run build
echo "6. Running build..."
npm run build

echo ""
echo "=== Migration Complete! ==="
echo "Your project is now at: ~/projects/o4o-platform"
echo "To work with this project:"
echo "  cd ~/projects/o4o-platform/services/api-server"
echo ""
echo "To open in VS Code with WSL support:"
echo "  code ~/projects/o4o-platform"
echo ""
echo "Performance should be dramatically improved!"