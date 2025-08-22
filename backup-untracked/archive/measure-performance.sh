#!/bin/bash
# Measure CI/CD performance impact

echo "📊 Performance Measurement Script"
echo "================================="

# Measure without lock file
echo "Test 1: Install without package-lock.json"
START_TIME=$(date +%s%N)
npm install --no-audit --no-fund --prefer-offline > /dev/null 2>&1
END_TIME=$(date +%s%N)
DURATION_NO_LOCK=$((($END_TIME - $START_TIME)/1000000))
echo "Duration: ${DURATION_NO_LOCK}ms"

# Clean up
rm -rf node_modules

# Measure with lock file (if exists)
if [ -f "package-lock.json" ]; then
  echo ""
  echo "Test 2: Install with package-lock.json"
  START_TIME=$(date +%s%N)
  npm ci > /dev/null 2>&1
  END_TIME=$(date +%s%N)
  DURATION_WITH_LOCK=$((($END_TIME - $START_TIME)/1000000))
  echo "Duration: ${DURATION_WITH_LOCK}ms"
  
  # Calculate difference
  DIFF=$(($DURATION_NO_LOCK - $DURATION_WITH_LOCK))
  PERCENT=$((($DIFF * 100) / $DURATION_NO_LOCK))
  echo ""
  echo "Performance Impact:"
  echo "- npm ci is ${PERCENT}% faster than npm install"
else
  echo ""
  echo "⚠️  No package-lock.json found for comparison"
fi

# Memory usage check
echo ""
echo "Memory Usage:"
ps aux | grep -E "node|npm" | grep -v grep | awk '{sum+=$6} END {print "Total RSS: " sum/1024 " MB"}'

# Disk usage
echo ""
echo "Disk Usage:"
du -sh node_modules 2>/dev/null || echo "No node_modules found"

# Package count
echo ""
echo "Package Statistics:"
find node_modules -maxdepth 1 -type d | wc -l | awk '{print "Direct dependencies: " $1-1}'
find node_modules -name package.json | wc -l | awk '{print "Total packages: " $1}'