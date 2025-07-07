#!/bin/bash
# Fix AuthService import issues in WSL2 project

echo "=== Fixing AuthService Import Issues ==="
echo ""

# Navigate to WSL2 project
cd ~/projects/o4o-platform/apps/api-server

# Check services directory
echo "1. Checking services directory:"
ls -la src/services/ | grep -i auth

# Check for case sensitivity issues
echo ""
echo "2. Looking for AuthService files:"
find src -name "*uth*ervice*" -type f

# Check import statements that might be causing issues
echo ""
echo "3. Checking import statements for authService:"
grep -r "authService" src/ || echo "No lowercase authService imports found"

echo ""
echo "4. Checking import statements for AuthService:"
grep -r "AuthService" src/ | head -5

# Check what's actually in the services directory
echo ""
echo "5. All files in services directory:"
ls -la src/services/

echo ""
echo "=== Analysis complete ==="