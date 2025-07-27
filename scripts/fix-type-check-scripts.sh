#!/bin/bash

echo "🔧 Fixing type-check scripts across all workspaces..."

# Find all package.json files and fix the type-check script
find /home/user/o4o-platform -name "package.json" -type f | while read -r file; do
  # Check if the file contains the problematic script
  if grep -q '"type-check": "tsc --noEmit 2"' "$file"; then
    echo "Fixing: $file"
    sed -i 's/"type-check": "tsc --noEmit 2"/"type-check": "tsc --noEmit"/' "$file"
  fi
done

echo "✅ All type-check scripts fixed!"