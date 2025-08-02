#!/bin/bash
# Fix catch block error types

echo "🔧 Fixing catch block error types..."
echo "==================================="

# Find all files with catch (error) blocks
find . -name "*.ts" -o -name "*.tsx" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  if grep -q "catch (error)" "$file"; then
    # Replace catch (error) with catch (error: any)
    sed -i.bak 's/catch (error)/catch (error: any)/g' "$file"
    echo "  ✓ Fixed catch blocks in: $file"
  fi
done

# Clean up backup files
find . -name "*.bak" -delete

echo ""
echo "✅ Catch block error types fixed!"