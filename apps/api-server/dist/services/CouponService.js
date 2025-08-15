"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponService = void 0;
const connection_1 = require("../database/connection");
const Coupon_1 = require("../entities/Coupon");
class CouponService {
    constructor() {
        this.couponRepository = connection_1.AppDataSource.getRepository(Coupon_1.Coupon);
        this.usageRepository = connection_1.AppDataSource.getRepository(Coupon_1.CouponUsage);
    }
    /**
     * Create a new coupon
     */
    async createCoupon(data) {
        const coupon = this.couponRepository.create(data);
        return await this.couponRepository.save(coupon);
    }
    /**
     * Get coupon by code
     */
    async getCouponByCode(code) {
        return await this.couponRepository.findOne({
            where: { code: code.toUpperCase() }
        });
    }
    /**
     * Get all coupons with filters
     */
    async getCoupons(filters) {
        const query = this.couponRepository.createQueryBuilder('coupon');
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            query.andWhere('coupon.status = :status', { status: filters.status });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.active) {
            const now = new Date();
            query.andWhere('coupon.status = :status', { status: Coupon_1.CouponStatus.ACTIVE })
                .andWhere('(coupon.validFrom IS NULL OR coupon.validFrom <= :now)', { now })
                .andWhere('(coupon.validUntil IS NULL OR coupon.validUntil >= :now)', { now });
        }
        const page = (filters === null || filters === void 0 ? void 0 : filters.page) || 1;
        const limit = (filters === null || filters === void 0 ? void 0 : filters.limit) || 20;
        const offset = (page - 1) * limit;
        query.skip(offset).take(limit);
        query.orderBy('coupon.createdAt', 'DESC');
        const [coupons, total] = await query.getManyAndCount();
        return { coupons, total };
    }
    /**
     * Update a coupon
     */
    async updateCoupon(id, data) {
        await this.couponRepository.update(id, data);
        const coupon = await this.couponRepository.findOne({ where: { id } });
        if (!coupon) {
            throw new Error('Coupon not found');
        }
        return coupon;
    }
    /**
     * Delete a coupon
     */
    async deleteCoupon(id) {
        const result = await this.couponRepository.delete(id);
        if (result.affected === 0) {
            throw new Error('Coupon not found');
        }
    }
    /**
     * Validate coupon for customer
     */
    async validateCoupon(request) {
        const { code, customerId, subtotal, productIds, categoryIds } = request;
        // Get coupon
        const coupon = await this.getCouponByCode(code);
        if (!coupon) {
            return { valid: false, message: 'Invalid coupon code' };
        }
        // Check if coupon is valid
        if (!coupon.isValid()) {
            if (coupon.status !== Coupon_1.CouponStatus.ACTIVE) {
                return { valid: false, message: 'Coupon is inactive' };
            }
            if (coupon.validUntil && new Date() > coupon.validUntil) {
                return { valid: false, message: 'Coupon has expired' };
            }
            if (coupon.validFrom && new Date() < coupon.validFrom) {
                return { valid: false, message: 'Coupon is not yet valid' };
            }
            if (coupon.usageLimitPerCoupon > 0 && coupon.usedCount >= coupon.usageLimitPerCoupon) {
                return { valid: false, message: 'Coupon usage limit reached' };
            }
        }
        // Check minimum order amount
        if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
            return {
                valid: false,
                message: `Minimum order amount of ${coupon.minOrderAmount} required`
            };
        }
        // Check customer usage limit
        const customerUsageCount = await this.getCustomerUsageCount(coupon.id, customerId);
        if (!coupon.canBeUsedByCustomer(customerId, customerUsageCount)) {
            if (coupon.customerIds && coupon.customerIds.length > 0 && !coupon.customerIds.includes(customerId)) {
                return { valid: false, message: 'Coupon is not valid for this customer' };
            }
            if (coupon.usageLimitPerCustomer > 0 && customerUsageCount >= coupon.usageLimitPerCustomer) {
                return { valid: false, message: 'You have already used this coupon' };
            }
        }
        // Check product restrictions
        if (productIds && productIds.length > 0) {
            if (coupon.productIds && coupon.productIds.length > 0) {
                const hasValidProduct = productIds.some(id => { var _a; return (_a = coupon.productIds) === null || _a === void 0 ? void 0 : _a.includes(id); });
                if (!hasValidProduct) {
                    return { valid: false, message: 'Coupon is not valid for these products' };
                }
            }
            if (coupon.excludeProductIds && coupon.excludeProductIds.length > 0) {
                const hasExcludedProduct = productIds.some(id => { var _a; return (_a = coupon.excludeProductIds) === null || _a === void 0 ? void 0 : _a.includes(id); });
                if (hasExcludedProduct) {
                    return { valid: false, message: 'Coupon cannot be used with some products in your cart' };
                }
            }
        }
        // Check category restrictions
        if (categoryIds && categoryIds.length > 0) {
            if (coupon.categoryIds && coupon.categoryIds.length > 0) {
                const hasValidCategory = categoryIds.some(id => { var _a; return (_a = coupon.categoryIds) === null || _a === void 0 ? void 0 : _a.includes(id); });
                if (!hasValidCategory) {
                    return { valid: false, message: 'Coupon is not valid for these categories' };
                }
            }
        }
        // Calculate discount
        const discount = coupon.calculateDiscount(subtotal);
        return {
            valid: true,
            discount,
            message: `Coupon applied successfully. Discount: ${discount}`
        };
    }
    /**
     * Apply coupon to order
     */
    async applyCoupon(couponCode, customerId, orderId, subtotal, customerEmail, customerName) {
        const coupon = await this.getCouponByCode(couponCode);
        if (!coupon) {
            throw new Error('Invalid coupon code');
        }
        const validation = await this.validateCoupon({
            code: couponCode,
            customerId,
            subtotal
        });
        if (!validation.valid) {
            throw new Error(validation.message || 'Invalid coupon');
        }
        // Create usage record
        const usage = this.usageRepository.create({
            couponId: coupon.id,
            customerId,
            orderId,
            discountAmount: validation.discount || 0,
            customerEmail,
            customerName
        });
        await this.usageRepository.save(usage);
        // Update coupon usage count
        coupon.usedCount++;
        await this.couponRepository.save(coupon);
        return usage;
    }
    /**
     * Get customer usage count for a coupon
     */
    async getCustomerUsageCount(couponId, customerId) {
        return await this.usageRepository.count({
            where: {
                couponId,
                customerId
            }
        });
    }
    /**
     * Get coupon usage history
     */
    async getCouponUsageHistory(couponId) {
        return await this.usageRepository.find({
            where: { couponId },
            order: { usedAt: 'DESC' }
        });
    }
    /**
     * Get customer's available coupons
     */
    async getCustomerAvailableCoupons(customerId) {
        const now = new Date();
        const query = this.couponRepository.createQueryBuilder('coupon')
            .where('coupon.status = :status', { status: Coupon_1.CouponStatus.ACTIVE })
            .andWhere('(coupon.validFrom IS NULL OR coupon.validFrom <= :now)', { now })
            .andWhere('(coupon.validUntil IS NULL OR coupon.validUntil >= :now)', { now })
            .andWhere('(coupon.usageLimitPerCoupon = 0 OR coupon.usedCount < coupon.usageLimitPerCoupon)');
        // Include coupons that are either public or specifically for this customer
        query.andWhere('(coupon.customerIds IS NULL OR coupon.customerIds LIKE :customerId)', { customerId: `%${customerId}%` });
        const coupons = await query.getMany();
        // Filter out coupons that the customer has already used up to their limit
        const availableCoupons = [];
        for (const coupon of coupons) {
            const usageCount = await this.getCustomerUsageCount(coupon.id, customerId);
            if (coupon.canBeUsedByCustomer(customerId, usageCount)) {
                availableCoupons.push(coupon);
            }
        }
        return availableCoupons;
    }
    /**
     * Generate unique coupon code
     */
    generateCouponCode(prefix = 'COUPON', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = prefix;
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    /**
     * Bulk generate coupons
     */
    async bulkGenerateCoupons(template, count, prefix = 'PROMO') {
        const coupons = [];
        for (let i = 0; i < count; i++) {
            let code;
            let exists = true;
            // Generate unique code
            while (exists) {
                code = this.generateCouponCode(prefix);
                const existing = await this.getCouponByCode(code);
                exists = !!existing;
            }
            const coupon = await this.createCoupon({
                ...template,
                code: code
            });
            coupons.push(coupon);
        }
        return coupons;
    }
}
exports.CouponService = CouponService;
//# sourceMappingURL=CouponService.js.map