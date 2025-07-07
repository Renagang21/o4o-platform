#!/bin/bash
# Fix remaining TypeScript errors

echo "=== Fixing Remaining TypeScript Errors ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# 1. Fix UserController constructor issue
echo "1. Fixing UserController constructor..."
sed -i 's/private authService = new AuthService();/private authService: AuthService;/' src/controllers/userController.ts

# Add constructor to userController
cat >> /tmp/usercontroller_fix.txt << 'EOF'
  constructor() {
    const userRepository = AppDataSource.getRepository(User);
    this.authService = new AuthService(userRepository);
  }
EOF

# 2. Fix realtimeFeedbackService export in main.ts
echo "2. Adding realtimeFeedbackService export to main.ts..."
echo "" >> src/main.ts
echo "// Export services for other modules" >> src/main.ts
echo "export { realtimeFeedbackService } from './services/realtimeFeedbackService';" >> src/main.ts

# 3. Fix routes/v1 issue - create the file
echo "3. Creating routes/v1 index file..."
mkdir -p src/routes/v1
cat > src/routes/v1/index.ts << 'EOF'
import { Router } from 'express';

const router = Router();

// V1 API routes will be added here
router.get('/health', (req, res) => {
  res.json({ status: 'OK', version: 'v1' });
});

export default router;
EOF

# 4. Fix AuthService sub property
echo "4. Fixing AccessTokenPayload interface..."
sed -i 's/sub: user.id,/id: user.id,/' src/services/AuthService.ts

# 5. Fix initializeDatabase export
echo "5. Fixing database connection export..."
echo "" >> src/database/connection.ts
echo "// Export for backward compatibility" >> src/database/connection.ts
echo "export const initializeDatabase = async () => {" >> src/database/connection.ts
echo "  if (!AppDataSource.isInitialized) {" >> src/database/connection.ts
echo "    await AppDataSource.initialize();" >> src/database/connection.ts
echo "  }" >> src/database/connection.ts
echo "  return AppDataSource;" >> src/database/connection.ts
echo "};" >> src/database/connection.ts

# 6. Fix signageService export
echo "6. Fixing signageService export..."
sed -i 's/signageService/SignageService/g' src/services/GracefulDegradationService.ts

# 7. Fix type compatibility in middleware
echo "7. Fixing AuthRequest interface..."
# Update auth.ts AuthRequest to use UserRole enum
sed -i 's/role: string;/role: UserRole;/' src/middleware/auth.ts

# 8. Fix User entity status comparison
echo "8. Fixing UserStatus comparisons..."
sed -i "s/user.status !== 'active'/user.status !== UserStatus.ACTIVE/g" src/middleware/auth.ts
sed -i "s/user.status === 'active'/user.status === UserStatus.ACTIVE/g" src/middleware/auth.ts
sed -i "s/status !== 'approved'/status !== UserStatus.APPROVED/g" src/middleware/authMiddleware.ts
sed -i "s/=== 'approved'/=== UserStatus.APPROVED/g" src/middleware/authMiddleware.ts

echo ""
echo "=== Fixes Applied ==="
echo "Now running type check to see remaining errors..."

npm run type-check 2>&1 | grep "error TS" | wc -l | xargs echo "Remaining errors:"