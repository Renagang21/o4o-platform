"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CouponController_1 = require("../../controllers/CouponController");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const couponController = new CouponController_1.CouponController();
// Public routes - validate coupon (requires authentication)
router.post('/validate', auth_1.authenticateToken, couponController.validateCoupon);
router.get('/my-coupons', auth_1.authenticateToken, couponController.getCustomerCoupons);
// Admin routes
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
// CRUD operations
router.get('/', couponController.getAllCoupons);
router.get('/:id', couponController.getCoupon);
router.post('/', couponController.createCoupon);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);
// Additional admin routes
router.get('/:id/usage', couponController.getCouponUsageHistory);
router.post('/bulk-generate', couponController.bulkGenerateCoupons);
exports.default = router;
//# sourceMappingURL=coupon.routes.js.map