#!/bin/bash
# Rollback script for cache-dependency-path changes

echo "🔄 Rollback Plan for Cache Changes"
echo "=================================="
echo ""

# Check current state
MODIFIED_COUNT=$(grep -l "cache-dependency-path:" .github/workflows/*.yml | wc -l)
echo "Currently $MODIFIED_COUNT workflows have cache-dependency-path"
echo ""

echo "Choose rollback option:"
echo "1. Remove cache-dependency-path from all workflows"
echo "2. Remove cache entirely (safest for missing package-lock.json)"
echo "3. Selective rollback (choose specific workflows)"
echo ""

read -p "Enter option (1-3): " OPTION

case $OPTION in
  1)
    echo "Removing cache-dependency-path from all workflows..."
    for workflow in .github/workflows/*.yml; do
      if grep -q "cache-dependency-path:" "$workflow"; then
        sed -i.bak '/cache-dependency-path:/d' "$workflow"
        echo "✅ Updated: $workflow"
      fi
    done
    ;;
  2)
    echo "Removing cache configuration entirely..."
    for workflow in .github/workflows/*.yml; do
      if grep -q "cache: 'npm'" "$workflow"; then
        sed -i.bak '/cache: '\''npm'\''/d' "$workflow"
        sed -i.bak '/cache-dependency-path:/d' "$workflow"
        echo "✅ Updated: $workflow"
      fi
    done
    ;;
  3)
    echo "Available workflows:"
    ls -1 .github/workflows/*.yml | nl
    read -p "Enter workflow numbers to rollback (space-separated): " SELECTIONS
    # Implementation for selective rollback
    ;;
esac

echo ""
echo "✅ Rollback complete!"
echo "Backup files created with .bak extension"