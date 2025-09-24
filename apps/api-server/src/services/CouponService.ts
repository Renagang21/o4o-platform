import { AppDataSource } from '../database/connection';
import { Coupon, CouponUsage, CouponDiscountType, CouponStatus } from '../entities/Coupon';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { 
  CreateCouponDto,
  UpdateCouponDto,
  GetCouponsQueryDto,
  ValidateCouponDto,
  ApplyCouponDto,
  CouponValidationResult,
  CouponListResponse
} from '../dto/coupon.dto';
import logger from '../utils/simpleLogger';

export class CouponService {
  private couponRepository: Repository<Coupon>;
  private usageRepository: Repository<CouponUsage>;

  constructor() {
    this.couponRepository = AppDataSource.getRepository(Coupon);
    this.usageRepository = AppDataSource.getRepository(CouponUsage);
  }

  /**
   * Create a new coupon
   */
  async createCoupon(data: CreateCouponDto): Promise<Coupon> {
    try {
      // Ensure code is uppercase
      const couponData = {
        ...data,
        code: data.code.toUpperCase(),
        status: CouponStatus.ACTIVE,
        usedCount: 0
      };

      const coupon = this.couponRepository.create(couponData);
      const savedCoupon = await this.couponRepository.save(coupon);
      
      logger.info(`Coupon created: ${savedCoupon.code}`);
      return savedCoupon;
    } catch (error) {
      logger.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new Error('Coupon not found');
    }
    return coupon;
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    return await this.couponRepository.findOne({ 
      where: { code: code.toUpperCase() }
    });
  }

  /**
   * Get all coupons with filters and pagination
   */
  async getCoupons(query: GetCouponsQueryDto): Promise<CouponListResponse> {
    try {
      const { status, active, page = 1, limit = 20 } = query;
      const queryBuilder = this.couponRepository.createQueryBuilder('coupon');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('coupon.status = :status', { status });
      }

      if (active === true) {
        const now = new Date();
        queryBuilder
          .andWhere('coupon.status = :activeStatus', { activeStatus: CouponStatus.ACTIVE })
          .andWhere('(coupon.validFrom IS NULL OR coupon.validFrom <= :now)', { now })
          .andWhere('(coupon.validUntil IS NULL OR coupon.validUntil >= :now)', { now });
      }

      // Pagination
      const offset = (page - 1) * limit;
      queryBuilder
        .skip(offset)
        .take(limit)
        .orderBy('coupon.createdAt', 'DESC');

      // Execute query
      const [coupons, total] = await queryBuilder.getManyAndCount();

      // Format response
      const formattedCoupons = coupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        status: coupon.status,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        usedCount: coupon.usedCount,
        usageLimitPerCoupon: coupon.usageLimitPerCoupon,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscountAmount,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt
      }));

      return {
        coupons: formattedCoupons,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting coupons:', error);
      throw error;
    }
  }

  /**
   * Update a coupon
   */
  async updateCoupon(id: string, data: UpdateCouponDto): Promise<Coupon> {
    try {
      const coupon = await this.getCouponById(id);
      
      // Update coupon fields
      Object.assign(coupon, data);
      
      const updatedCoupon = await this.couponRepository.save(coupon);
      logger.info(`Coupon updated: ${updatedCoupon.code}`);
      
      return updatedCoupon;
    } catch (error) {
      logger.error('Error updating coupon:', error);
      throw error;
    }
  }

  /**
   * Delete a coupon
   */
  async deleteCoupon(id: string): Promise<void> {
    try {
      const result = await this.couponRepository.delete(id);
      if (result.affected === 0) {
        throw new Error('Coupon not found');
      }
      logger.info(`Coupon deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting coupon:', error);
      throw error;
    }
  }

  /**
   * Validate coupon for customer
   */
  async validateCoupon(data: ValidateCouponDto): Promise<CouponValidationResult> {
    try {
      const { code, customerId, subtotal, productIds, categoryIds } = data;

      // Get coupon
      const coupon = await this.getCouponByCode(code);
      if (!coupon) {
        return { 
          valid: false, 
          message: 'Invalid coupon code'
        };
      }

      // Check if coupon is active
      if (coupon.status !== CouponStatus.ACTIVE) {
        return { 
          valid: false, 
          message: 'Coupon is not active'
        };
      }

      // Check validity dates
      const now = new Date();
      if (coupon.validFrom && now < coupon.validFrom) {
        return { 
          valid: false, 
          message: 'Coupon is not yet valid'
        };
      }
      if (coupon.validUntil && now > coupon.validUntil) {
        return { 
          valid: false, 
          message: 'Coupon has expired'
        };
      }

      // Check usage limits
      if (coupon.usageLimitPerCoupon && coupon.usedCount >= coupon.usageLimitPerCoupon) {
        return { 
          valid: false, 
          message: 'Coupon usage limit reached'
        };
      }

      // Check minimum order amount
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return { 
          valid: false, 
          message: `Minimum order amount of ${coupon.minOrderAmount} required`
        };
      }

      // Check customer usage limit
      if (coupon.usageLimitPerCustomer) {
        const customerUsageCount = await this.getCustomerUsageCount(coupon.id, customerId);
        if (customerUsageCount >= coupon.usageLimitPerCustomer) {
          return { 
            valid: false, 
            message: 'You have already used this coupon'
          };
        }
      }

      // Check customer restrictions
      if (coupon.customerIds && coupon.customerIds.length > 0) {
        if (!coupon.customerIds.includes(customerId)) {
          return { 
            valid: false, 
            message: 'Coupon is not valid for this customer'
          };
        }
      }

      // Check product restrictions
      if (productIds && productIds.length > 0 && coupon.productIds && coupon.productIds.length > 0) {
        const hasValidProduct = productIds.some(id => coupon.productIds?.includes(id));
        if (!hasValidProduct) {
          return { 
            valid: false, 
            message: 'Coupon is not valid for these products'
          };
        }
      }

      // Check category restrictions
      if (categoryIds && categoryIds.length > 0 && coupon.categoryIds && coupon.categoryIds.length > 0) {
        const hasValidCategory = categoryIds.some(id => coupon.categoryIds?.includes(id));
        if (!hasValidCategory) {
          return { 
            valid: false, 
            message: 'Coupon is not valid for these categories'
          };
        }
      }

      // Calculate discount
      const discount = this.calculateDiscount(coupon, subtotal);

      return { 
        valid: true, 
        message: 'Coupon is valid',
        discount,
        discountType: coupon.discountType,
        couponId: coupon.id
      };
    } catch (error) {
      logger.error('Error validating coupon:', error);
      throw error;
    }
  }

  /**
   * Apply coupon to order
   */
  async applyCoupon(data: ApplyCouponDto): Promise<CouponUsage> {
    try {
      const { couponCode, customerId, orderId, subtotal, customerEmail, customerName } = data;

      // Validate coupon first
      const validation = await this.validateCoupon({
        code: couponCode,
        customerId,
        subtotal
      });

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const coupon = await this.getCouponByCode(couponCode);
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      // Create usage record
      const usage = this.usageRepository.create({
        couponId: coupon.id,
        customerId,
        orderId,
        discountAmount: validation.discount || 0,
        customerEmail,
        customerName,
        usedAt: new Date()
      });

      const savedUsage = await this.usageRepository.save(usage);

      // Update coupon usage count
      coupon.usedCount++;
      await this.couponRepository.save(coupon);

      logger.info(`Coupon applied: ${couponCode} for order ${orderId}`);
      return savedUsage;
    } catch (error) {
      logger.error('Error applying coupon:', error);
      throw error;
    }
  }

  /**
   * Get customer usage count for a coupon
   */
  async getCustomerUsageCount(couponId: string, customerId: string): Promise<number> {
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
  async getCouponUsageHistory(couponId: string): Promise<CouponUsage[]> {
    return await this.usageRepository.find({
      where: { couponId },
      order: { usedAt: 'DESC' }
    });
  }

  /**
   * Get customer's available coupons
   */
  async getCustomerAvailableCoupons(customerId: string): Promise<Coupon[]> {
    try {
      const now = new Date();
      
      const queryBuilder = this.couponRepository.createQueryBuilder('coupon');
      
      queryBuilder
        .where('coupon.status = :status', { status: CouponStatus.ACTIVE })
        .andWhere('(coupon.validFrom IS NULL OR coupon.validFrom <= :now)', { now })
        .andWhere('(coupon.validUntil IS NULL OR coupon.validUntil >= :now)', { now })
        .andWhere('(coupon.usageLimitPerCoupon = 0 OR coupon.usedCount < coupon.usageLimitPerCoupon)');

      // Include coupons that are either public or specifically for this customer
      queryBuilder.andWhere(
        '(coupon.customerIds IS NULL OR coupon.customerIds LIKE :customerId)', 
        { customerId: `%${customerId}%` }
      );

      const coupons = await queryBuilder.getMany();

      // Filter out coupons that the customer has already used up to their limit
      const availableCoupons = [];
      for (const coupon of coupons) {
        if (coupon.usageLimitPerCustomer) {
          const usageCount = await this.getCustomerUsageCount(coupon.id, customerId);
          if (usageCount >= coupon.usageLimitPerCustomer) {
            continue;
          }
        }
        availableCoupons.push(coupon);
      }

      return availableCoupons;
    } catch (error) {
      logger.error('Error getting customer available coupons:', error);
      throw error;
    }
  }

  /**
   * Generate unique coupon code
   */
  generateCouponCode(prefix: string = 'COUPON', length: number = 8): string {
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
  async bulkGenerateCoupons(
    template: CreateCouponDto,
    count: number,
    prefix: string = 'PROMO'
  ): Promise<Coupon[]> {
    try {
      const coupons: Coupon[] = [];
      
      for (let i = 0; i < count; i++) {
        let code: string;
        let exists = true;
        
        // Generate unique code
        while (exists) {
          code = this.generateCouponCode(prefix);
          const existing = await this.getCouponByCode(code);
          exists = !!existing;
        }
        
        const coupon = await this.createCoupon({
          ...template,
          code: code!
        });
        
        coupons.push(coupon);
      }
      
      logger.info(`Bulk generated ${count} coupons with prefix ${prefix}`);
      return coupons;
    } catch (error) {
      logger.error('Error bulk generating coupons:', error);
      throw error;
    }
  }

  /**
   * Get coupon statistics
   */
  async getCouponStatistics(couponId: string): Promise<any> {
    try {
      const coupon = await this.getCouponById(couponId);
      const usages = await this.getCouponUsageHistory(couponId);
      
      const totalDiscountGiven = usages.reduce((sum, usage) => sum + usage.discountAmount, 0);
      const uniqueCustomers = new Set(usages.map(u => u.customerId)).size;
      
      return {
        coupon: {
          code: coupon.code,
          description: coupon.description,
          status: coupon.status
        },
        statistics: {
          totalUses: coupon.usedCount,
          uniqueCustomers,
          totalDiscountGiven,
          averageDiscount: coupon.usedCount > 0 ? totalDiscountGiven / coupon.usedCount : 0,
          remainingUses: coupon.usageLimitPerCoupon ? coupon.usageLimitPerCoupon - coupon.usedCount : null
        }
      };
    } catch (error) {
      logger.error('Error getting coupon statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate discount amount
   */
  private calculateDiscount(coupon: Coupon, subtotal: number): number {
    let discount = 0;
    
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discount = (subtotal * coupon.discountValue) / 100;
      
      // Apply max discount cap if set
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === CouponDiscountType.FIXED_CART) {
      discount = coupon.discountValue;
      
      // Ensure discount doesn't exceed subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }
    }
    
    return Math.round(discount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Deactivate expired coupons (for cron job)
   */
  async deactivateExpiredCoupons(): Promise<void> {
    try {
      const now = new Date();
      
      const result = await this.couponRepository
        .createQueryBuilder()
        .update(Coupon)
        .set({ status: CouponStatus.EXPIRED })
        .where('status = :status', { status: CouponStatus.ACTIVE })
        .andWhere('validUntil IS NOT NULL')
        .andWhere('validUntil < :now', { now })
        .execute();
      
      if (result.affected && result.affected > 0) {
        logger.info(`Deactivated ${result.affected} expired coupons`);
      }
    } catch (error) {
      logger.error('Error deactivating expired coupons:', error);
    }
  }
}