#!/bin/bash

# Fix TypeScript type casting syntax errors
# Changes "as any." to "(as any)."

echo "🔧 Fixing TypeScript type casting syntax errors..."

# Find all TypeScript/TSX files in admin-dashboard
find apps/admin-dashboard/src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Check if file contains the pattern
  if grep -q " as any\." "$file"; then
    echo "  Fixing: $file"
    # Replace "as any." with "(as any)."
    sed -i 's/\([^(]\)as any\./\1(as any)./g' "$file"
  fi
done

echo "✅ Type casting syntax errors fixed!"