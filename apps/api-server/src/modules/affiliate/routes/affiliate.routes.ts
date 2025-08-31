import { Router } from 'express';
import { AffiliateController } from '../controllers/affiliate.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware';

const router: Router = Router();
const affiliateController = new AffiliateController();

// Public endpoints (with rate limiting)
router.post(
  '/track-click',
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  affiliateController.trackClick
);

router.post(
  '/track-conversion',
  rateLimitMiddleware({ windowMs: 60000, max: 50 }), // 50 conversions per minute
  affiliateController.trackConversion
);

// Protected endpoints (require authentication)
router.post(
  '/create',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 creates per minute
  affiliateController.createAffiliateUser
);

router.get(
  '/user/:userId?',
  authenticate,
  affiliateController.getAffiliateUser
);

router.post(
  '/generate-link',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 links per minute
  affiliateController.generateAffiliateLink
);

router.get(
  '/stats',
  authenticate,
  affiliateController.getAffiliateStats
);

export default router;