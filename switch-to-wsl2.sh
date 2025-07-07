#!/bin/bash
# Script to switch to WSL2 project location and continue build fixes

echo "=== Switching to WSL2 Project Location ==="
echo ""

# Navigate to the WSL2 project
cd ~/projects/o4o-platform/apps/api-server

# Show current location
echo "Current working directory:"
pwd

# Show project structure
echo ""
echo "Project structure:"
ls -la

# Check package.json exists
echo ""
echo "Checking package.json:"
if [ -f "package.json" ]; then
    echo "✓ package.json found"
    echo "Project name: $(grep '"name"' package.json | head -1)"
else
    echo "✗ package.json not found"
fi

# Check tsconfig.json
echo ""
echo "Checking tsconfig.json:"
if [ -f "tsconfig.json" ]; then
    echo "✓ tsconfig.json found"
else
    echo "✗ tsconfig.json not found"
fi

# Check src directory
echo ""
echo "Checking src directory:"
if [ -d "src" ]; then
    echo "✓ src directory found"
    echo "Files in src:"
    find src -name "*.ts" | head -10
else
    echo "✗ src directory not found"
fi

echo ""
echo "=== Ready to continue build fixes ==="