#!/bin/bash

# Script to validate package.json files and remove invalid dependencies
# This helps prevent Firebase Studio npm "2" bug

echo "🔍 Validating dependencies across all package.json files..."
echo ""

FIXED_COUNT=0

# Function to clean invalid dependencies from a package.json file
clean_package_json() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Check for numeric dependencies
    if grep -qE '"[0-9]+":\s*"' "$file"; then
        echo "⚠️  Found invalid dependencies in $file:"
        grep -nE '"[0-9]+":\s*"' "$file"
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Remove lines with numeric dependencies
        sed -i '/"[0-9]":\s*"/d' "$file"
        
        # Fix trailing commas
        sed -i ':a;N;$!ba;s/,\n\s*}/\n}/g' "$file"
        sed -i ':a;N;$!ba;s/,\n\s*]/\n]/g' "$file"
        
        echo "✅ Fixed $file (backup saved as $file.backup)"
        ((FIXED_COUNT++))
        echo ""
    fi
}

# Check root package.json
clean_package_json "package.json"

# Check all workspace package.json files
for pkg in apps/*/package.json packages/*/package.json; do
    clean_package_json "$pkg"
done

# Summary
if [ $FIXED_COUNT -eq 0 ]; then
    echo "✅ All package.json files are clean - no invalid dependencies found!"
else
    echo "🔧 Fixed $FIXED_COUNT package.json file(s)"
    echo ""
    echo "⚠️  Please review the changes and run:"
    echo "   rm -rf node_modules package-lock.json"
    echo "   npm install"
fi

# Also check package-lock.json if it exists
if [ -f "package-lock.json" ] && grep -qE '"[0-9]+":\s*\{' "package-lock.json"; then
    echo ""
    echo "⚠️  Invalid dependencies also found in package-lock.json"
    echo "   Run: rm package-lock.json && npm install"
fi