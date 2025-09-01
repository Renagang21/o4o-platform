import { Router } from 'express';
import { CouponController } from '../../controllers/CouponController';
import { authenticateToken, requireAdmin, requireManagerOrAdmin } from '../../middleware/auth';

const router: Router = Router();
const couponController = new CouponController();

// Public routes - validate coupon (requires authentication)
router.post('/validate', authenticateToken, couponController.validateCoupon);
router.get('/my-coupons', authenticateToken, couponController.getCustomerCoupons);

// Admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// CRUD operations
router.get('/', couponController.getAllCoupons);
router.get('/:id', couponController.getCoupon);
router.post('/', couponController.createCoupon);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

// Additional admin routes
router.get('/:id/usage', couponController.getCouponUsageHistory);
router.post('/bulk-generate', couponController.bulkGenerateCoupons);

export default router;