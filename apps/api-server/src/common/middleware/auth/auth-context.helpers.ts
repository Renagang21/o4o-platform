/**
 * Auth Context Helpers — Types & Shared Utilities
 *
 * Extracted from auth.middleware.ts (WO-O4O-AUTH-MIDDLEWARE-SPLIT-V1)
 * Contains: AuthRequest interfaces, token extraction, type definitions
 */
import { Request } from 'express';
import type { User } from '../../../modules/auth/entities/User.js';
import type { RoleAssignment } from '../../../modules/auth/entities/RoleAssignment.js';
import type { AccessTokenPayload } from '../../../types/auth.js';

// ============================================================================
// Request Interfaces
// ============================================================================

/**
 * Extended Request interface with authenticated user
 */
export interface AuthRequest extends Request {
  user?: User;
  roleAssignment?: RoleAssignment;
}

/**
 * Extended Request interface for Service Users
 */
export interface ServiceAuthRequest extends Request {
  serviceUser?: {
    providerUserId: string;
    provider?: string;
    email: string;
    displayName?: string;
    profileImage?: string;
    serviceId?: string;
    storeId?: string;
    tokenType: 'service';
  };
  tokenPayload?: AccessTokenPayload;
}

/**
 * Extended Request interface for Guest Users
 */
export interface GuestAuthRequest extends Request {
  guestUser?: {
    guestSessionId: string;
    serviceId?: string;
    storeId?: string;
    deviceId?: string;
    tokenType: 'guest';
  };
  tokenPayload?: AccessTokenPayload;
}

/**
 * Extended Request interface for Guest or Service Users
 */
export interface GuestOrServiceAuthRequest extends Request {
  guestUser?: {
    guestSessionId: string;
    serviceId?: string;
    storeId?: string;
    deviceId?: string;
    tokenType: 'guest';
  };
  serviceUser?: {
    providerUserId: string;
    provider?: string;
    email: string;
    displayName?: string;
    profileImage?: string;
    serviceId?: string;
    storeId?: string;
    tokenType: 'service';
  };
  tokenPayload?: AccessTokenPayload;
}

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Extract JWT token from Authorization header or httpOnly cookie
 */
export function extractToken(req: Request): string | null {
  // Try Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try httpOnly cookie (production)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}
