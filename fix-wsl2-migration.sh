#!/bin/bash
# Fix script for WSL2 migration issues

echo "=== Fixing WSL2 Migration Issues ==="
echo ""

# Navigate to the cloned project
cd ~/projects/o4o-platform

# The project structure has changed - it's now using apps/ instead of services/
echo "1. Navigating to correct api-server location..."
cd apps/api-server

# Install dependencies with legacy peer deps to resolve React 19 conflicts
echo "2. Installing dependencies with --legacy-peer-deps..."
npm install --legacy-peer-deps

# Run type check
echo "3. Running type check..."
npm run type-check

# Check if build script exists
echo "4. Checking available scripts..."
npm run

# Try to build if script exists
if npm run | grep -q "build"; then
    echo "5. Running build..."
    npm run build
else
    echo "5. No build script found, checking TypeScript compilation..."
    npx tsc --version
    npx tsc
fi

echo ""
echo "=== Fix Complete! ==="
echo "Project location: ~/projects/o4o-platform/apps/api-server"
echo ""
echo "To work with the project:"
echo "  cd ~/projects/o4o-platform/apps/api-server"
echo ""
echo "To open in VS Code:"
echo "  code ~/projects/o4o-platform"