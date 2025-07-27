#!/bin/bash

# Fix all type-check scripts that have the erroneous "2" at the end

echo "🔧 Fixing type-check commands in all package.json files..."

# Find all package.json files and fix the type-check script
find . -name "package.json" -type f | while read file; do
  if grep -q '"type-check": "tsc --noEmit 2"' "$file"; then
    echo "Fixing: $file"
    sed -i 's/"type-check": "tsc --noEmit 2"/"type-check": "tsc --noEmit"/' "$file"
  fi
done

echo "✅ All type-check commands fixed!"