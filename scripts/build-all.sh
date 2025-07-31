#!/bin/bash

# Build all workspaces without the '2' bug

echo "🔨 Building all workspaces..."

# Build packages first
echo "📦 Building packages..."
npm run build:packages

# Counter for errors
ERRORS=0

# Function to run build in a directory
run_build() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/package.json" ] && grep -q '"build"' "$dir/package.json"; then
        echo ""
        echo "🔨 Building $name..."
        cd "$dir"
        npm run build
        if [ $? -ne 0 ]; then
            ((ERRORS++))
        fi
        cd - > /dev/null
    fi
}

# Build all apps
for app in apps/*; do
    if [ -d "$app" ]; then
        run_build "$app" "$(basename $app)"
    fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ All builds completed successfully!"
    exit 0
else
    echo "❌ Build failed with $ERRORS errors"
    exit 1
fi