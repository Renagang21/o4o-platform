#!/bin/bash

echo "🔧 Fixing UI component imports..."

# Fix all UI components that need ElementRef and ComponentPropsWithoutRef
ui_components=(
  "checkbox"
  "dialog"
  "dropdown-menu"
  "popover"
  "progress"
  "radio-group"
  "scroll-area"
  "select"
  "separator"
  "slider"
  "switch"
  "table"
  "tabs"
  "textarea"
  "tooltip"
)

for component in "${ui_components[@]}"; do
  file="src/components/ui/${component}.tsx"
  if [[ -f "$file" ]]; then
    echo "Fixing $file..."
    # Check if ElementRef is already imported
    if ! grep -q "import.*ElementRef" "$file"; then
      # Add the import at the beginning of the file
      sed -i '1i import { ElementRef, ComponentPropsWithoutRef } from "react"' "$file"
    fi
  fi
done

# Fix alert.tsx - remove unused import
echo "Fixing alert.tsx..."
sed -i '1d' src/components/ui/alert.tsx 2>/dev/null || true
sed -i 's/, type HTMLAttributes//g' src/components/ui/alert.tsx 2>/dev/null || true

# Fix badge.tsx - remove unused import
echo "Fixing badge.tsx..."
sed -i '1d' src/components/ui/badge.tsx 2>/dev/null || true
sed -i 's/import { forwardRef/import { type/' src/components/ui/badge.tsx 2>/dev/null || true

# Fix card.tsx - remove unused import
echo "Fixing card.tsx..."
sed -i '1d' src/components/ui/card.tsx 2>/dev/null || true
sed -i 's/, type HTMLAttributes//g' src/components/ui/card.tsx 2>/dev/null || true

# Fix dialog.tsx - remove unused HTMLAttributes
echo "Fixing dialog.tsx..."
sed -i 's/, type HTMLAttributes//g' src/components/ui/dialog.tsx 2>/dev/null || true

# Fix dropdown-menu.tsx - remove unused HTMLAttributes
echo "Fixing dropdown-menu.tsx..."
sed -i 's/, type HTMLAttributes//g' src/components/ui/dropdown-menu.tsx 2>/dev/null || true

echo "✅ UI component imports fixed!"