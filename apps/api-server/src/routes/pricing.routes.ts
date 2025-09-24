import { Router, Request, Response } from 'express';
import { PricingController } from '../controllers/pricing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();
const pricingController = new PricingController();

// Public routes - anyone can calculate prices
router.post('/calculate', (req: Request, res: Response) =>
  pricingController.calculateProductPrice(req, res)
);

router.post('/cart-total', (req: Request, res: Response) =>
  pricingController.calculateCartTotal(req, res)
);

router.get('/tax-rate', (req: Request, res: Response) =>
  pricingController.getTaxRate(req, res)
);

router.post('/shipping', (req: Request, res: Response) =>
  pricingController.calculateShipping(req, res)
);

// Protected routes - authenticated users get personalized pricing
router.use(authenticate);

router.post('/validate-coupon', (req: Request, res: Response) =>
  pricingController.validateCoupon(req, res)
);

router.post('/breakdown', (req: Request, res: Response) =>
  pricingController.getPricingBreakdown(req, res)
);

export default router;