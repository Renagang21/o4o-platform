#!/bin/bash
# Fix import case sensitivity issues

echo "=== Fixing Import Case Sensitivity Issues ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# Fix userController.ts import
echo "1. Fixing userController.ts import..."
sed -i "s|from '../services/authService'|from '../services/AuthService'|g" src/controllers/userController.ts

# Remove the duplicate AuthService file
echo "2. Removing duplicate AuthService file..."
rm -f src/services/AuthService-DESKTOP-SS4Q2DK.ts

# Verify the changes
echo "3. Verifying import fixes..."
echo "userController.ts imports:"
grep "import.*AuthService" src/controllers/userController.ts

echo ""
echo "authMiddleware.ts imports:"
grep "import.*AuthService" src/middleware/authMiddleware.ts

echo ""
echo "4. Checking remaining AuthService files:"
ls -la src/services/ | grep -i authservice

echo ""
echo "=== Import fixes complete ==="