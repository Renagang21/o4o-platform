#!/bin/bash
# Fix React UMD global errors

echo "🔧 Fixing React UMD global errors..."
echo "===================================="

# Common React types that need to be imported
REACT_TYPES=(
  "useState"
  "useEffect"
  "useRef"
  "useCallback"
  "useMemo"
  "useContext"
  "useReducer"
  "useLayoutEffect"
  "Component"
  "PureComponent"
  "memo"
  "forwardRef"
  "createContext"
  "Fragment"
  "Children"
  "cloneElement"
  "createElement"
  "isValidElement"
  "ReactNode"
  "ReactElement"
  "ComponentType"
  "HTMLAttributes"
  "FormEvent"
  "ChangeEvent"
  "MouseEvent"
  "KeyboardEvent"
  "SyntheticEvent"
  "CSSProperties"
  "RefObject"
  "MutableRefObject"
  "Dispatch"
  "SetStateAction"
)

# Find all files using React. pattern
find . -name "*.tsx" -o -name "*.ts" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  if grep -q "React\." "$file"; then
    echo "Processing: $file"
    
    # Create a list of React types used in this file
    USED_TYPES=""
    
    for type in "${REACT_TYPES[@]}"; do
      if grep -q "React\.$type" "$file"; then
        # Replace React.type with just type
        sed -i.bak "s/React\.$type/$type/g" "$file"
        
        # Add to list of used types if not already in imports
        if ! grep -q "import.*$type.*from 'react'" "$file"; then
          if [ -z "$USED_TYPES" ]; then
            USED_TYPES="$type"
          else
            USED_TYPES="$USED_TYPES, $type"
          fi
        fi
      fi
    done
    
    # Add missing imports
    if [ -n "$USED_TYPES" ]; then
      # Check if there's already a React import
      if grep -q "import.*from 'react'" "$file"; then
        # Add to existing import
        if grep -q "import {.*} from 'react'" "$file"; then
          # Extract existing imports
          EXISTING=$(grep "import {.*} from 'react'" "$file" | sed -n "s/import {\(.*\)} from 'react'.*/\1/p" | head -1)
          
          # Combine with new imports, avoiding duplicates
          ALL_IMPORTS="$EXISTING, $USED_TYPES"
          # Remove duplicates
          UNIQUE_IMPORTS=$(echo "$ALL_IMPORTS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | sort -u | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
          
          # Replace the import line
          sed -i.bak "0,/import {.*} from 'react'/s/import {.*} from 'react'/import { $UNIQUE_IMPORTS } from 'react'/" "$file"
        else
          # Add named imports to default import
          sed -i.bak "s/import React from 'react'/import React, { $USED_TYPES } from 'react'/g" "$file"
        fi
      else
        # No React import at all, add new one at the beginning
        sed -i.bak "1s/^/import { $USED_TYPES } from 'react';\n/" "$file"
      fi
    fi
    
    echo "  ✓ Fixed: $file"
  fi
done

# Clean up backup files
find . -name "*.bak" -delete

echo ""
echo "✅ React UMD global errors fixed!"