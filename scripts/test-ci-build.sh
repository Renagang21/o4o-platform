#!/bin/bash
set -e

echo "=== CI Build Test ==="
echo "This script simulates the CI environment to test the build process"
echo

# Clean everything
echo "1. Cleaning all build artifacts and node_modules..."
npm run clean

# Fresh install like CI
echo -e "\n2. Running npm ci (clean install)..."
npm ci

# Test without building packages first (this should fail)
echo -e "\n3. Testing type-check without building packages (should fail)..."
cd apps/api-server
if npm run type-check 2>&1; then
  echo "ERROR: type-check should have failed without built packages!"
  exit 1
else
  echo "✓ Correctly failed without built packages"
fi

# Go back to root
cd ../..

# Build packages
echo -e "\n4. Building packages..."
npm run build:packages

# Test with built packages (this should succeed)
echo -e "\n5. Testing type-check with built packages (should succeed)..."
cd apps/api-server
if npm run type-check 2>&1; then
  echo "✓ type-check succeeded with built packages"
else
  echo "ERROR: type-check failed even with built packages!"
  exit 1
fi

echo -e "\n=== Test Complete ==="
echo "The CI workflow has been fixed to ensure packages are built before type-checking."