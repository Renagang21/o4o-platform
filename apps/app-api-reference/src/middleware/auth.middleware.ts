/**
 * Authentication Middleware
 * =============================================================================
 * Delegates authentication to Core API.
 *
 * Rules (from app-api-architecture.md):
 * - App API does NOT implement own authentication
 * - App API delegates to Core API for JWT verification
 * - App API receives user context from Core API
 * =============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';

// Extended request with user context
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  isAuthenticated: boolean;
}

/**
 * Verify JWT token with Core API
 * This is the ONLY way App API should verify authentication
 */
export async function verifyWithCoreAPI(token: string): Promise<{
  valid: boolean;
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  error?: string;
}> {
  try {
    const response = await axios.get(`${env.CORE_API_URL}/api/v1/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });

    if (response.data.success && response.data.data?.user) {
      return {
        valid: true,
        user: response.data.data.user,
      };
    }

    return { valid: false, error: 'Invalid token' };
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { valid: false, error: 'Token expired or invalid' };
    }
    return { valid: false, error: 'Core API verification failed' };
  }
}

/**
 * Authentication middleware
 * Extracts JWT from Authorization header and verifies with Core API
 */
export function authMiddleware(options: { required?: boolean } = {}) {
  const { required = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    authReq.isAuthenticated = false;

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      if (required) {
        return res.status(401).json({
          success: false,
          error: 'Authorization header required',
        });
      }
      return next();
    }

    const token = authHeader.substring(7);

    // Verify with Core API
    const result = await verifyWithCoreAPI(token);

    if (!result.valid) {
      if (required) {
        return res.status(401).json({
          success: false,
          error: result.error || 'Authentication failed',
        });
      }
      return next();
    }

    // Set user context
    authReq.user = result.user;
    authReq.isAuthenticated = true;

    next();
  };
}

/**
 * Require authentication middleware
 * Use this for protected routes
 */
export const requireAuth = authMiddleware({ required: true });

/**
 * Optional authentication middleware
 * Use this for routes that work with or without auth
 */
export const optionalAuth = authMiddleware({ required: false });
