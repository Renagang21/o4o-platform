import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Configuration
 * Centralized rate limiting configurations for different API endpoints
 */

/**
 * Get client IP for rate limiting (handles proxy environments)
 */
function getClientIP(req: any): string {
  if (process.env.NODE_ENV === 'production') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
  }
  return req.ip || 'unknown';
}

/**
 * Skip rate limiting for localhost
 */
function isLocalhost(req: any): boolean {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * Standard rate limiter for authenticated endpoints
 * 100 requests per 15 minutes
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100,
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

/**
 * Lenient rate limiter for public endpoints
 * 1000 requests per 15 minutes
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

/**
 * Very lenient rate limiter for settings endpoints
 * 2000 requests per 15 minutes
 */
export const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: {
    error: 'Too many settings requests',
    code: 'SETTINGS_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

/**
 * Lenient rate limiter for SSO check endpoint
 * 500 requests per 15 minutes
 */
export const ssoCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: 'Too many SSO check requests',
    code: 'SSO_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

/**
 * Lenient rate limiter for user permissions endpoint
 * 500 requests per 15 minutes
 */
export const userPermissionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: 'Too many permission requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

/**
 * Strict rate limiter for enrollment creation
 * 3 requests per minute (per Phase B security spec)
 */
export const enrollmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: {
    error: 'Too many enrollment requests. Please try again later.',
    code: 'ENROLLMENT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

/**
 * Lenient rate limiter for admin review actions
 * 20 requests per minute (for operator protection)
 */
export const adminReviewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    error: 'Too many admin review requests',
    code: 'ADMIN_REVIEW_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: isLocalhost
});

// Export all limiters as an object for convenience
export const rateLimiters = {
  standard: standardLimiter,
  public: publicLimiter,
  settings: settingsLimiter,
  ssoCheck: ssoCheckLimiter,
  userPermissions: userPermissionsLimiter,
  enrollment: enrollmentLimiter,
  adminReview: adminReviewLimiter
};
