import { Router } from 'express';
import { TrackingController } from '../../controllers/TrackingController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAnyRole } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';
import rateLimit from 'express-rate-limit';

const router: Router = Router();
const trackingController = new TrackingController();

// ===== RATE LIMITERS =====

/**
 * Public click tracking rate limiter
 * - 100 requests per 15 minutes per IP
 * - Prevents click farming
 */
const clickRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many click requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated admin users (for testing)
    return req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPER_ADMIN;
  }
});

/**
 * API rate limiter for authenticated endpoints
 * - 1000 requests per 15 minutes per user
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// ===== PERMISSION HELPERS =====

const adminOnly = requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
const partnerOrAdmin = requireAnyRole([UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN]);

// ===== CLICK TRACKING ROUTES =====

/**
 * POST /api/v1/tracking/click
 * Record a referral click (PUBLIC, rate-limited)
 */
router.post('/click', clickRateLimiter, trackingController.recordClick);

/**
 * GET /api/v1/tracking/clicks
 * Get clicks with filters (Authenticated: Partner/Admin)
 */
router.get('/clicks', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getClicks);

/**
 * GET /api/v1/tracking/clicks/:id
 * Get click by ID (Authenticated: Partner/Admin)
 */
router.get('/clicks/:id', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getClick);

/**
 * GET /api/v1/tracking/clicks/stats
 * Get click stats for partner (Authenticated: Partner/Admin)
 */
router.get('/clicks/stats', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getClickStats);

// ===== CONVERSION TRACKING ROUTES =====

/**
 * POST /api/v1/tracking/conversion
 * Create conversion event (Admin only)
 */
router.post('/conversion', authenticate, apiRateLimiter, adminOnly, trackingController.createConversion);

/**
 * GET /api/v1/tracking/conversions
 * Get conversions with filters (Authenticated: Partner/Admin)
 */
router.get('/conversions', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getConversions);

/**
 * GET /api/v1/tracking/conversions/:id
 * Get conversion by ID (Authenticated: Partner/Admin)
 */
router.get('/conversions/:id', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getConversion);

/**
 * POST /api/v1/tracking/conversions/:id/confirm
 * Confirm conversion (Admin only)
 */
router.post('/conversions/:id/confirm', authenticate, apiRateLimiter, adminOnly, trackingController.confirmConversion);

/**
 * POST /api/v1/tracking/conversions/:id/cancel
 * Cancel conversion (Admin only)
 */
router.post('/conversions/:id/cancel', authenticate, apiRateLimiter, adminOnly, trackingController.cancelConversion);

/**
 * POST /api/v1/tracking/conversions/:id/refund
 * Process refund on conversion (Admin only)
 */
router.post('/conversions/:id/refund', authenticate, apiRateLimiter, adminOnly, trackingController.processRefund);

/**
 * GET /api/v1/tracking/conversions/stats
 * Get conversion stats (Authenticated: Partner/Admin)
 */
router.get('/conversions/stats', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getConversionStats);

// ===== COMMISSION MANAGEMENT ROUTES =====

/**
 * POST /api/v1/tracking/commissions
 * Create commission from conversion (Admin only)
 */
router.post('/commissions', authenticate, apiRateLimiter, adminOnly, trackingController.createCommission);

/**
 * GET /api/v1/tracking/commissions
 * Get commissions with filters (Authenticated: Partner/Admin)
 */
router.get('/commissions', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getCommissions);

/**
 * POST /api/v1/tracking/commissions/:id/confirm
 * Confirm commission (Admin only)
 */
router.post('/commissions/:id/confirm', authenticate, apiRateLimiter, adminOnly, trackingController.confirmCommission);

/**
 * POST /api/v1/tracking/commissions/:id/cancel
 * Cancel commission (Admin only)
 */
router.post('/commissions/:id/cancel', authenticate, apiRateLimiter, adminOnly, trackingController.cancelCommission);

/**
 * POST /api/v1/tracking/commissions/:id/adjust
 * Adjust commission amount (Admin only)
 */
router.post('/commissions/:id/adjust', authenticate, apiRateLimiter, adminOnly, trackingController.adjustCommission);

/**
 * POST /api/v1/tracking/commissions/:id/pay
 * Mark commission as paid (Admin only)
 */
router.post('/commissions/:id/pay', authenticate, apiRateLimiter, adminOnly, trackingController.markAsPaid);

/**
 * GET /api/v1/tracking/commissions/stats
 * Get commission stats (Authenticated: Partner/Admin)
 */
router.get('/commissions/stats', authenticate, apiRateLimiter, partnerOrAdmin, trackingController.getCommissionStats);

// ===== POLICY MANAGEMENT ROUTES =====

/**
 * POST /api/v1/tracking/policies
 * Create or update commission policy (Admin only)
 */
router.post('/policies', authenticate, apiRateLimiter, adminOnly, trackingController.upsertPolicy);

/**
 * GET /api/v1/tracking/policies
 * Get policies with filters (Admin only)
 */
router.get('/policies', authenticate, apiRateLimiter, adminOnly, trackingController.getPolicies);

export default router;
