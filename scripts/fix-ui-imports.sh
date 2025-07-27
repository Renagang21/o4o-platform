#!/bin/bash

echo "Fixing UI component imports..."

# Fix all files with incorrect import syntax
find apps/admin-dashboard/src/components/ui -name "*.tsx" -type f | while read file; do
  # Fix double "type type" issue
  sed -i 's/type type /type /g' "$file"
  
  # Fix imports based on actual usage in each file
  filename=$(basename "$file")
  
  case "$filename" in
    "alert.tsx"|"badge.tsx"|"card.tsx"|"checkbox.tsx"|"dialog.tsx"|"dropdown-menu.tsx"|"popover.tsx"|"progress.tsx"|"radio-group.tsx"|"scroll-area.tsx"|"select.tsx"|"separator.tsx"|"slider.tsx"|"switch.tsx"|"table.tsx"|"tabs.tsx")
      # These files use forwardRef but may not use other imports
      if grep -q "HTMLAttributes" "$file"; then
        sed -i '1s/.*/import { forwardRef, type HTMLAttributes } from "react"/' "$file"
      else
        sed -i '1s/.*/import { forwardRef } from "react"/' "$file"
      fi
      ;;
    "button.tsx"|"input.tsx"|"textarea.tsx")
      # These files use forwardRef
      sed -i '1s/.*/import { forwardRef } from "react"/' "$file"
      ;;
    "label.tsx")
      # Label uses forwardRef and LabelHTMLAttributes
      sed -i '1s/.*/import { forwardRef, type LabelHTMLAttributes } from "react"/' "$file"
      ;;
    *)
      # Default: just remove unused imports
      sed -i 's/, LabelHTMLAttributes//g' "$file"
      sed -i 's/LabelHTMLAttributes, //g' "$file"
      sed -i 's/, ElementRef//g' "$file"
      sed -i 's/ElementRef, //g' "$file"
      sed -i 's/, ComponentPropsWithoutRef//g' "$file"
      sed -i 's/ComponentPropsWithoutRef, //g' "$file"
      ;;
  esac
done

echo "UI import fixes complete!"