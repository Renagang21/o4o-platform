#!/bin/bash

echo "🔧 Fixing component imports..."

# Fix SortableFormField.tsx - add ReactNode import
echo "Fixing SortableFormField.tsx..."
if [[ -f "src/components/forms/SortableFormField.tsx" ]] && ! grep -q "ReactNode" "src/components/forms/SortableFormField.tsx"; then
  sed -i '1i import { ReactNode } from "react"' src/components/forms/SortableFormField.tsx
fi

# Fix MediaLibrary.tsx - add FC and createElement
echo "Fixing MediaLibrary.tsx..."
if [[ -f "src/components/media/MediaLibrary.tsx" ]]; then
  # Add FC and createElement to existing imports
  sed -i 's/import { useState, useCallback }/import { useState, useCallback, FC, createElement }/' src/components/media/MediaLibrary.tsx
fi

# Fix BlockPalette.tsx - add ReactNode
echo "Fixing BlockPalette.tsx..."
if [[ -f "src/components/template/BlockPalette.tsx" ]] && ! grep -q "ReactNode" "src/components/template/BlockPalette.tsx"; then
  sed -i 's/import { FC, useState }/import { FC, useState, ReactNode }/' src/components/template/BlockPalette.tsx
fi

# Fix badge.tsx import issue
echo "Fixing badge.tsx import..."
sed -i 's/import { type, type HTMLAttributes }/import { type HTMLAttributes }/' src/components/ui/badge.tsx 2>/dev/null || true

# Fix unused imports in Library.tsx
echo "Fixing Library.tsx unused imports..."
sed -i 's/, RefreshCw//g' src/pages/media/Library.tsx 2>/dev/null || true
sed -i 's/, X//g' src/pages/media/Library.tsx 2>/dev/null || true

# Fix UserForm.tsx - add type annotation for onChange
echo "Fixing UserForm.tsx..."
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' src/pages/users/UserForm.tsx 2>/dev/null || true

# Remove unused variable in BlockEditor.tsx
echo "Fixing BlockEditor.tsx..."
sed -i '/interface SpacingControlProps/,/^}/d' src/components/template/BlockEditor.tsx 2>/dev/null || true

echo "✅ Component imports fixed!"