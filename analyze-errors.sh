#!/bin/bash
# Analyze TypeScript errors by category

echo "=== Phase 2: TypeScript Error Analysis ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# Run type check and capture full output
echo "1. Capturing all TypeScript errors..."
npm run type-check 2>&1 > typescript-errors.log || true

# Count total errors
TOTAL_ERRORS=$(grep -E "error TS" typescript-errors.log | wc -l)
echo "Total TypeScript errors: $TOTAL_ERRORS"
echo ""

# Analyze error categories
echo "2. Analyzing error categories..."
echo ""

# Category 1: Enum usage errors (type used as value)
echo "Category 1: Enum Usage Errors (TS2693)"
ENUM_ERRORS=$(grep -E "error TS2693.*only refers to a type.*being used as a value" typescript-errors.log | wc -l)
echo "Count: $ENUM_ERRORS"
echo "Examples:"
grep -E "error TS2693" typescript-errors.log | head -3
echo ""

# Category 2: Property doesn't exist errors
echo "Category 2: Missing Properties (TS2339, TS2353)"
PROP_ERRORS=$(grep -E "error TS(2339|2353)" typescript-errors.log | wc -l)
echo "Count: $PROP_ERRORS"
echo "Examples:"
grep -E "error TS(2339|2353)" typescript-errors.log | head -3
echo ""

# Category 3: Type assignment errors
echo "Category 3: Type Assignment Errors (TS2322, TS2345)"
TYPE_ERRORS=$(grep -E "error TS(2322|2345)" typescript-errors.log | wc -l)
echo "Count: $TYPE_ERRORS"
echo "Examples:"
grep -E "error TS(2322|2345)" typescript-errors.log | head -3
echo ""

# Category 4: Module import errors
echo "Category 4: Module Import Errors (TS2305, TS2307)"
MODULE_ERRORS=$(grep -E "error TS(2305|2307)" typescript-errors.log | wc -l)
echo "Count: $MODULE_ERRORS"
echo "Examples:"
grep -E "error TS(2305|2307)" typescript-errors.log | head -3
echo ""

# Category 5: Interface/Type compatibility errors
echo "Category 5: Interface Compatibility (TS2367, TS2430)"
INTERFACE_ERRORS=$(grep -E "error TS(2367|2430)" typescript-errors.log | wc -l)
echo "Count: $INTERFACE_ERRORS"
echo "Examples:"
grep -E "error TS(2367|2430)" typescript-errors.log | head -3
echo ""

# Category 6: Function argument errors
echo "Category 6: Function Argument Errors (TS2554, TS2769)"
FUNC_ERRORS=$(grep -E "error TS(2554|2769)" typescript-errors.log | wc -l)
echo "Count: $FUNC_ERRORS"
echo "Examples:"
grep -E "error TS(2554|2769)" typescript-errors.log | head -3
echo ""

# Category 7: Other errors
OTHER_ERRORS=$((TOTAL_ERRORS - ENUM_ERRORS - PROP_ERRORS - TYPE_ERRORS - MODULE_ERRORS - INTERFACE_ERRORS - FUNC_ERRORS))
echo "Category 7: Other Errors"
echo "Count: $OTHER_ERRORS"
echo ""

# Summary by file
echo "3. Errors by file (top 10):"
grep -E "^src/.*error TS" typescript-errors.log | cut -d'(' -f1 | sort | uniq -c | sort -nr | head -10
echo ""

# Critical files analysis
echo "4. Critical files with most errors:"
echo ""
echo "Controllers:"
grep -E "^src/controllers/.*error TS" typescript-errors.log | cut -d'(' -f1 | sort | uniq -c | sort -nr
echo ""
echo "Services:"
grep -E "^src/services/.*error TS" typescript-errors.log | cut -d'(' -f1 | sort | uniq -c | sort -nr | head -10
echo ""

# Save summary
cat > error-analysis-summary.txt << EOF
=== TypeScript Error Analysis Summary ===
Date: $(date)
Location: ~/projects/o4o-platform/apps/api-server

Error Categories:
1. Enum Usage Errors: $ENUM_ERRORS
2. Missing Properties: $PROP_ERRORS  
3. Type Assignment: $TYPE_ERRORS
4. Module Import: $MODULE_ERRORS
5. Interface Compatibility: $INTERFACE_ERRORS
6. Function Arguments: $FUNC_ERRORS
7. Other: $OTHER_ERRORS

Total Errors: $TOTAL_ERRORS
EOF

echo "=== Analysis Complete ==="
echo "Full error log saved to: typescript-errors.log"
echo "Summary saved to: error-analysis-summary.txt"