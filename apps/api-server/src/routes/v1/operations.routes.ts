import { Router, type Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import { OperationsController } from '../../controllers/operationsController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { UserRole } from '../../entities/User.js';
import rateLimit from 'express-rate-limit';

/**
 * Operations Routes
 *
 * Administrative endpoints for commission management.
 * All routes require admin authentication.
 *
 * @routes /api/v1/operations
 * @phase Phase 2.2
 */

const router: ExpressRouter = Router();
const operationsController = new OperationsController();

// Rate limiter for admin operations (higher limit than public endpoints)
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.'
      }
    });
  }
});

// Admin-only middleware
const requireAnyRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const hasRole = roles.some(role => req.user?.hasRole(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

const adminOnly = requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

/**
 * Commission Management
 */

// List commissions with filters and pagination
router.get(
  '/commissions',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.listCommissions
);

// Adjust commission amount
router.post(
  '/commissions/:id/adjust',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.adjustCommission
);

// Cancel commission
router.post(
  '/commissions/:id/cancel',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.cancelCommission
);

// Mark commission as paid
router.post(
  '/commissions/:id/pay',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.markCommissionAsPaid
);

/**
 * Refund Processing
 */

// Process refund for a conversion
router.post(
  '/refunds',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.processRefund
);

/**
 * Audit Trail
 */

// Get audit trail for specific entity
router.get(
  '/audit-trail/:entityType/:entityId',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.getAuditTrail
);

// Get user activity log
router.get(
  '/activity/user/:userId',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.getUserActivity
);

// Get recent activity across all entities
router.get(
  '/activity/recent',
  authenticate,
  adminRateLimiter,
  adminOnly,
  operationsController.getRecentActivity
);

export default router;
