#!/bin/bash

# Test all workspaces without the '2' bug

echo "🧪 Running tests for all workspaces..."

# Build packages first
echo "📦 Building packages..."
npm run build:packages

# Counter for errors
ERRORS=0

# Function to run test in a directory
run_test() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/package.json" ] && grep -q '"test"' "$dir/package.json"; then
        echo ""
        echo "🧪 Testing $name..."
        cd "$dir"
        npm run test
        if [ $? -ne 0 ]; then
            ((ERRORS++))
        fi
        cd - > /dev/null
    fi
}

# Check all apps
for app in apps/*; do
    if [ -d "$app" ]; then
        run_test "$app" "$(basename $app)"
    fi
done

# Check all packages
for pkg in packages/*; do
    if [ -d "$pkg" ]; then
        run_test "$pkg" "$(basename $pkg)"
    fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Tests failed with $ERRORS errors"
    exit 1
fi