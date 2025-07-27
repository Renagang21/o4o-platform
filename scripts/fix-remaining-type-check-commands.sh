#!/bin/bash

echo "🔧 Fixing remaining type-check commands with '2' at the end..."

# Find all package.json files with the incorrect type-check command
files_to_fix=$(find . -name "package.json" -type f -exec grep -l '"type-check": "tsc --noEmit 2"' {} \;)

for file in $files_to_fix; do
  echo "Fixing: $file"
  sed -i 's/"type-check": "tsc --noEmit 2"/"type-check": "tsc --noEmit"/' "$file"
done

echo "✅ All type-check commands fixed!"
echo ""
echo "Fixed files:"
echo "$files_to_fix"