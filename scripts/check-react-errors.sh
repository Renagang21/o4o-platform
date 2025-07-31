#!/bin/bash

echo "🔍 Checking for React-related TypeScript errors..."

# Create a temp file for errors
temp_file=$(mktemp)

# Run type check and capture errors
cd /home/user/o4o-platform/apps/admin-dashboard
echo "Running type check (this may take a moment)..."
npx tsc --noEmit 2>&1 > "$temp_file" || true

# Count different types of errors
total_errors=$(grep -c "error TS" "$temp_file" || echo "0")
unused_errors=$(grep -c "error TS6133" "$temp_file" || echo "0")
react_global_errors=$(grep -c "React' refers to a UMD global" "$temp_file" || echo "0")
not_found_errors=$(grep -c "error TS2304" "$temp_file" || echo "0")

echo ""
echo "📊 Error Summary:"
echo "Total errors: $total_errors"
echo "Unused variable errors (TS6133): $unused_errors"
echo "React global errors: $react_global_errors"
echo "Cannot find name errors (TS2304): $not_found_errors"

if [ "$total_errors" -gt 0 ]; then
    echo ""
    echo "📋 Sample errors (first 10):"
    grep "error TS" "$temp_file" | head -10
fi

# Clean up
rm "$temp_file"

echo ""
echo "✅ Check complete!"