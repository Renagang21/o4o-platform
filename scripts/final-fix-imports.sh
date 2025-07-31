#!/bin/bash

echo "Final fix for all import statements..."

# Find and fix all TypeScript files with broken imports
find apps/admin-dashboard/src -name "*.tsx" -type f -exec sh -c '
  for file do
    # Fix various broken import patterns
    sed -i "s/import { \(.*\) }, { FC } from '\''react'\'';/import { \1, FC } from '\''react'\'';/g" "$file"
    sed -i "s/import { FC } '\''react'\''/import { FC } from '\''react'\''/g" "$file"
    sed -i "s/import { FC, \(.*\) } '\''react'\''/import { FC, \1 } from '\''react'\''/g" "$file"
    sed -i "s/} '\''react'\''/} from '\''react'\''/g" "$file"
    sed -i "s/} '\''react-router-dom'\''/} from '\''react-router-dom'\''/g" "$file"
    sed -i "s/} '\''lucide-react'\''/} from '\''lucide-react'\''/g" "$file"
    sed -i "s/} '\''@tanstack\/react-query'\''/} from '\''@tanstack\/react-query'\''/g" "$file"
    sed -i "s/} '\''\(.*\)'\''/} from '\''\1'\''/g" "$file"
  done
' sh {} +

echo "Fixed imports. Now fixing specific files with more complex issues..."

# Fix MediaLibrary
sed -i '1s/.*/import { FC, Fragment } from '\''react'\'';/' apps/admin-dashboard/src/components/media/MediaLibrary.tsx

# Fix UserForm 
sed -i '7s/.*/import { FC, useState } from '\''react'\'';/' apps/admin-dashboard/src/components/users/UserForm.tsx

# Fix all simple FC imports in pages
find apps/admin-dashboard/src/pages -name "*.tsx" -type f -exec grep -l "^import { FC }" {} \; | while read file; do
  sed -i '1s/.*/import { FC } from '\''react'\'';/' "$file"
done

echo "Final import fixes complete!"