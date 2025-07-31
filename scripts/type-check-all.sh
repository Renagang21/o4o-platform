#!/bin/bash

# Type check all workspaces without the '2' bug

echo "🔍 Running type check for all workspaces..."

# Build packages first
echo "📦 Building packages..."
npm run build:packages

# Counter for errors
ERRORS=0

# Function to run type-check in a directory
run_type_check() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/package.json" ] && grep -q '"type-check"' "$dir/package.json"; then
        echo ""
        echo "✅ Checking $name..."
        cd "$dir"
        npm run type-check
        if [ $? -ne 0 ]; then
            ((ERRORS++))
        fi
        cd - > /dev/null
    fi
}

# Check all apps
for app in apps/*; do
    if [ -d "$app" ]; then
        run_type_check "$app" "$(basename $app)"
    fi
done

# Check all packages
for pkg in packages/*; do
    if [ -d "$pkg" ]; then
        run_type_check "$pkg" "$(basename $pkg)"
    fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ All type checks passed!"
    exit 0
else
    echo "❌ Type check failed with $ERRORS errors"
    exit 1
fi