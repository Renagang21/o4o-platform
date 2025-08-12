"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponController = void 0;
const CouponService_1 = require("../services/CouponService");
const Coupon_1 = require("../entities/Coupon");
class CouponController {
    constructor() {
        /**
         * Get all coupons (Admin)
         */
        this.getAllCoupons = async (req, res) => {
            try {
                const { status, active, page = 1, limit = 20 } = req.query;
                const result = await this.couponService.getCoupons({
                    status: status,
                    active: active === 'true',
                    page: Number(page),
                    limit: Number(limit)
                });
                res.json({
                    success: true,
                    data: result.coupons,
                    pagination: {
                        total: result.total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(result.total / Number(limit))
                    }
                });
            }
            catch (error) {
                console.error('Error fetching coupons:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch coupons'
                });
            }
        };
        /**
         * Get single coupon (Admin)
         */
        this.getCoupon = async (req, res) => {
            try {
                const { id } = req.params;
                const coupon = await this.couponService.couponRepository.findOne({ where: { id } });
                if (!coupon) {
                    res.status(404).json({
                        success: false,
                        message: 'Coupon not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: coupon
                });
            }
            catch (error) {
                console.error('Error fetching coupon:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch coupon'
                });
            }
        };
        /**
         * Create coupon (Admin)
         */
        this.createCoupon = async (req, res) => {
            try {
                const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, validFrom, validUntil, usageLimitPerCoupon, usageLimitPerCustomer, productIds, categoryIds, excludeProductIds, customerIds, customerGroups, freeShipping, excludeSaleItems, individualUseOnly } = req.body;
                // Validate required fields
                if (!code || !discountType || discountValue === undefined) {
                    res.status(400).json({
                        success: false,
                        message: 'Code, discount type, and discount value are required'
                    });
                    return;
                }
                // Check if code already exists
                const existing = await this.couponService.getCouponByCode(code);
                if (existing) {
                    res.status(400).json({
                        success: false,
                        message: 'Coupon code already exists'
                    });
                    return;
                }
                const coupon = await this.couponService.createCoupon({
                    code: code.toUpperCase(),
                    description,
                    discountType,
                    discountValue,
                    minOrderAmount,
                    maxDiscountAmount,
                    validFrom: validFrom ? new Date(validFrom) : undefined,
                    validUntil: validUntil ? new Date(validUntil) : undefined,
                    usageLimitPerCoupon: usageLimitPerCoupon || 0,
                    usageLimitPerCustomer: usageLimitPerCustomer || 1,
                    productIds,
                    categoryIds,
                    excludeProductIds,
                    customerIds,
                    customerGroups,
                    freeShipping: freeShipping || false,
                    excludeSaleItems: excludeSaleItems || false,
                    individualUseOnly: individualUseOnly !== false,
                    status: Coupon_1.CouponStatus.ACTIVE
                });
                res.status(201).json({
                    success: true,
                    data: coupon,
                    message: 'Coupon created successfully'
                });
            }
            catch (error) {
                console.error('Error creating coupon:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create coupon'
                });
            }
        };
        /**
         * Update coupon (Admin)
         */
        this.updateCoupon = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                // If code is being updated, check for duplicates
                if (updateData.code) {
                    updateData.code = updateData.code.toUpperCase();
                    const existing = await this.couponService.getCouponByCode(updateData.code);
                    if (existing && existing.id !== id) {
                        res.status(400).json({
                            success: false,
                            message: 'Coupon code already exists'
                        });
                        return;
                    }
                }
                // Convert date strings to Date objects
                if (updateData.validFrom) {
                    updateData.validFrom = new Date(updateData.validFrom);
                }
                if (updateData.validUntil) {
                    updateData.validUntil = new Date(updateData.validUntil);
                }
                const coupon = await this.couponService.updateCoupon(id, updateData);
                res.json({
                    success: true,
                    data: coupon,
                    message: 'Coupon updated successfully'
                });
            }
            catch (error) {
                console.error('Error updating coupon:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update coupon'
                });
            }
        };
        /**
         * Delete coupon (Admin)
         */
        this.deleteCoupon = async (req, res) => {
            try {
                const { id } = req.params;
                await this.couponService.deleteCoupon(id);
                res.json({
                    success: true,
                    message: 'Coupon deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting coupon:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete coupon'
                });
            }
        };
        /**
         * Validate coupon for customer
         */
        this.validateCoupon = async (req, res) => {
            var _a;
            try {
                const { code, subtotal, productIds, categoryIds } = req.body;
                const customerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!customerId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                    return;
                }
                if (!code || !subtotal) {
                    res.status(400).json({
                        success: false,
                        message: 'Coupon code and subtotal are required'
                    });
                    return;
                }
                const result = await this.couponService.validateCoupon({
                    code,
                    customerId,
                    subtotal,
                    productIds,
                    categoryIds
                });
                res.json({
                    success: result.valid,
                    message: result.message,
                    data: result.valid ? {
                        discount: result.discount,
                        finalAmount: subtotal - (result.discount || 0)
                    } : null
                });
            }
            catch (error) {
                console.error('Error validating coupon:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to validate coupon'
                });
            }
        };
        /**
         * Get customer's available coupons
         */
        this.getCustomerCoupons = async (req, res) => {
            var _a;
            try {
                const customerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!customerId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                    return;
                }
                const coupons = await this.couponService.getCustomerAvailableCoupons(customerId);
                res.json({
                    success: true,
                    data: coupons
                });
            }
            catch (error) {
                console.error('Error fetching customer coupons:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch available coupons'
                });
            }
        };
        /**
         * Get coupon usage history (Admin)
         */
        this.getCouponUsageHistory = async (req, res) => {
            try {
                const { id } = req.params;
                const usages = await this.couponService.getCouponUsageHistory(id);
                res.json({
                    success: true,
                    data: usages
                });
            }
            catch (error) {
                console.error('Error fetching usage history:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch usage history'
                });
            }
        };
        /**
         * Bulk generate coupons (Admin)
         */
        this.bulkGenerateCoupons = async (req, res) => {
            try {
                const { template, count, prefix } = req.body;
                if (!template || !count) {
                    res.status(400).json({
                        success: false,
                        message: 'Template and count are required'
                    });
                    return;
                }
                if (count > 100) {
                    res.status(400).json({
                        success: false,
                        message: 'Cannot generate more than 100 coupons at once'
                    });
                    return;
                }
                const coupons = await this.couponService.bulkGenerateCoupons(template, count, prefix || 'BULK');
                res.json({
                    success: true,
                    data: coupons,
                    message: `${coupons.length} coupons generated successfully`
                });
            }
            catch (error) {
                console.error('Error generating coupons:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to generate coupons'
                });
            }
        };
        this.couponService = new CouponService_1.CouponService();
    }
}
exports.CouponController = CouponController;
//# sourceMappingURL=CouponController.js.map