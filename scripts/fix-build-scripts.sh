#!/bin/bash
# Fix build scripts to use npx

echo "🔧 Fixing build scripts to use npx..."
echo "===================================="

# Find all package.json files and update tsc to npx tsc
find packages -name "package.json" | while read file; do
  if grep -q '"build": "tsc"' "$file"; then
    echo "Updating: $file"
    sed -i 's/"build": "tsc"/"build": "npx tsc"/g' "$file"
  fi
done

# Also fix any other scripts that use tsc directly
find . -name "package.json" | grep -E "(apps|packages)" | while read file; do
  if grep -q '"tsc"' "$file"; then
    echo "Checking: $file"
    # Update type-check scripts
    sed -i 's/"type-check": "tsc --noEmit"/"type-check": "npx tsc --noEmit"/g' "$file"
    # Update watch scripts
    sed -i 's/"watch": "tsc --watch"/"watch": "npx tsc --watch"/g' "$file"
    # Update build:watch scripts
    sed -i 's/"build:watch": "tsc --watch"/"build:watch": "npx tsc --watch"/g' "$file"
  fi
done

echo ""
echo "✅ Build scripts fixed!"