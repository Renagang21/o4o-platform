import { Router } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware';

const router: Router = Router();
const partnerController = new PartnerController();

// Public endpoints (with rate limiting)
router.post(
  '/track-click',
  rateLimitMiddleware({ windowMs: 60000, max: 100 }), // 100 requests per minute
  partnerController.trackClick
);

router.post(
  '/track-conversion',
  rateLimitMiddleware({ windowMs: 60000, max: 50 }), // 50 conversions per minute
  partnerController.trackConversion
);

// Protected endpoints (require authentication)
router.post(
  '/create',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 creates per minute
  partnerController.createPartnerUser
);

router.get(
  '/user/:userId?',
  authenticate,
  partnerController.getPartnerUser
);

router.post(
  '/generate-link',
  authenticate,
  rateLimitMiddleware({ windowMs: 60000, max: 30 }), // 30 links per minute
  partnerController.generatePartnerLink
);

router.get(
  '/stats',
  authenticate,
  partnerController.getPartnerStats
);

export default router;