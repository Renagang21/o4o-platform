#!/bin/bash
# Create proper auth types file

echo "=== Creating Auth Types File ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# Check if types directory exists
echo "1. Checking types directory..."
if [ ! -d "src/types" ]; then
    mkdir -p src/types
    echo "Created src/types directory"
else
    echo "src/types directory already exists"
fi

# Create the auth.ts file with proper type definitions
echo ""
echo "2. Creating auth.ts with comprehensive type definitions..."

cat > src/types/auth.ts << 'EOF'
import { Request } from 'express';

/**
 * User roles enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  BUSINESS = 'business',
  AFFILIATE = 'affiliate'
}

/**
 * User status enum
 */
export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  ACTIVE = 'active'
}

/**
 * JWT Access Token Payload
 */
export interface AccessTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions?: string[];
  domain?: string | null;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated User interface
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions?: string[];
  domain?: string | null;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Auth response interface
 */
export interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken?: string;
}

/**
 * Login request interface
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request interface
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}
EOF

echo "✓ Created comprehensive auth.ts file"

# Verify the file was created
echo ""
echo "3. Verifying auth.ts file..."
if [ -f "src/types/auth.ts" ]; then
    echo "✓ src/types/auth.ts created successfully"
    echo "File size: $(wc -l < src/types/auth.ts) lines"
else
    echo "✗ Failed to create src/types/auth.ts"
fi

echo ""
echo "=== Auth types creation complete ==="