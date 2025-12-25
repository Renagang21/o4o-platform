/**
 * API Routes
 * =============================================================================
 * Example API routes demonstrating Core API integration patterns.
 *
 * Patterns demonstrated:
 * - Protected routes with auth middleware
 * - Calling Core API for user data
 * - Optional auth routes
 * =============================================================================
 */

import { Router, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/v1/me
 * Returns current user info - demonstrates Core API integration
 * This delegates to Core API rather than implementing user lookup
 */
router.get('/me', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  // User is already verified by auth middleware
  // We can use the user context directly
  res.json({
    success: true,
    data: {
      user: authReq.user,
      source: 'core-api-delegated',
    },
  });
});

/**
 * GET /api/v1/profile
 * Example: Fetch extended profile from Core API
 */
router.get('/profile', requireAuth, async (req, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const token = req.headers.authorization?.substring(7);

  try {
    // Forward request to Core API
    const response = await axios.get(`${env.CORE_API_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });

    res.json({
      success: true,
      data: response.data.data,
      source: 'core-api',
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch profile from Core API',
    });
  }
});

/**
 * GET /api/v1/public/info
 * Example: Public endpoint (no auth required)
 */
router.get('/public/info', (req, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'app-api-reference',
      version: '1.0.0',
      description: 'Reference implementation for O4O App API servers',
    },
  });
});

/**
 * GET /api/v1/optional
 * Example: Route that works with or without auth
 */
router.get('/optional', optionalAuth, (req, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  res.json({
    success: true,
    data: {
      authenticated: authReq.isAuthenticated,
      user: authReq.user || null,
      message: authReq.isAuthenticated
        ? 'You are authenticated'
        : 'You are browsing as a guest',
    },
  });
});

/**
 * POST /api/v1/echo
 * Example: Protected POST endpoint
 */
router.post('/echo', requireAuth, (req, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  res.json({
    success: true,
    data: {
      echo: req.body,
      user: authReq.user,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
