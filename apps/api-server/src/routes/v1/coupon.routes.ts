import { Router } from 'express';
import { CouponController } from '../../controllers/CouponController';
import { authenticate } from '../../middleware/auth';
import { hasRole } from '../../middleware/rbac';

const router = Router();
const couponController = new CouponController();

// Public routes - validate coupon (requires authentication)
router.post('/validate', authenticate, couponController.validateCoupon);
router.get('/my-coupons', authenticate, couponController.getCustomerCoupons);

// Admin routes
router.use(authenticate);
router.use(hasRole(['admin']));

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