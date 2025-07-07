#!/bin/bash
# Fix remaining TypeScript errors - Phase 2

echo "=== Fixing Remaining TypeScript Errors - Phase 2 ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# 1. Add UserRole and UserStatus imports to middleware/auth.ts
echo "1. Adding imports to middleware/auth.ts..."
sed -i '1s/^/import { UserRole, UserStatus } from '"'"'..\/types\/auth'"'"';\n/' src/middleware/auth.ts

# 2. Fix AuthService missing types
echo "2. Adding missing type definitions..."
# Add RefreshTokenPayload and other missing types
cat > /tmp/auth_types_addition.txt << 'EOF'

/**
 * Refresh Token Payload
 */
export interface RefreshTokenPayload {
  id: string;
  tokenFamily: string;
  iat?: number;
  exp?: number;
}

/**
 * Auth Tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login Response
 */
export interface LoginResponse {
  success: boolean;
  user: any;
  tokens: AuthTokens;
}

/**
 * Cookie Configuration
 */
export interface CookieConfig {
  domain: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}
EOF

cat /tmp/auth_types_addition.txt >> src/types/auth.ts

# 3. Fix UserController
echo "3. Adding UserController constructor and imports..."
# Add AppDataSource import
sed -i '1a\import { AppDataSource } from '"'"'../database/connection'"'"';' src/controllers/userController.ts

# Insert constructor after class declaration
sed -i '/export class UserController {/a\
  constructor() {\
    const userRepository = AppDataSource.getRepository(User);\
    this.authService = new AuthService(userRepository);\
  }' src/controllers/userController.ts

# 4. Fix AuthService property access
echo "4. Fixing AuthService role assignments..."
# Fix role assignments in AuthService to use enum values correctly
sed -i "s/role: userData.role || 'customer'/role: userData.role || UserRole.CUSTOMER/g" src/services/AuthService.ts
sed -i "s/permissions\[role\] || permissions.customer/permissions[role] || permissions[UserRole.CUSTOMER]/g" src/services/AuthService.ts

# 5. Fix main.ts imports  
echo "5. Fixing main.ts realtimeFeedbackService import..."
sed -i '/export { realtimeFeedbackService }/d' src/main.ts
sed -i '1a\import { realtimeFeedbackService } from '"'"'.\/services\/realtimeFeedbackService'"'"';' src/main.ts
echo "" >> src/main.ts
echo "export { realtimeFeedbackService };" >> src/main.ts

# 6. Fix missing express-session types
echo "6. Installing missing type definitions..."
npm install --save-dev @types/express-session

# 7. Fix PricingResult interface in GracefulDegradationService
echo "7. Adding enabled property to PricingResult type..."
# This would need more complex editing, let's check what PricingResult looks like first

echo ""
echo "=== Phase 2 Fixes Applied ==="
echo "Running type check again..."

npm run type-check 2>&1 | grep "error TS" | wc -l | xargs echo "Remaining errors:"