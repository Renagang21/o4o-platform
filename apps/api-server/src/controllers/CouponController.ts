import { Request, Response } from 'express';
import { CouponService } from '../services/CouponService';
import { CouponStatus } from '../entities/Coupon';
import { AuthRequest } from '../types/auth';
import { 
  CreateCouponDto,
  UpdateCouponDto,
  GetCouponsQueryDto,
  ValidateCouponDto,
  ApplyCouponDto
} from '../dto/coupon.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import logger from '../utils/simpleLogger';

export class CouponController {
  private couponService: CouponService;

  constructor() {
    this.couponService = new CouponService();
  }

  /**
   * Get all coupons (Admin)
   */
  getAllCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = plainToClass(GetCouponsQueryDto, req.query);
      const errors = await validate(query);
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: errors.map(e => Object.values(e.constraints || {}).join(', '))
        });
        return;
      }

      const result = await this.couponService.getCoupons(query);

      res.json({
        success: true,
        data: result.coupons,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('Failed to fetch coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons'
      });
    }
  };

  /**
   * Get single coupon (Admin)
   */
  getCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const coupon = await this.couponService.getCouponById(id);

      res.json({
        success: true,
        data: coupon
      });
    } catch (error: any) {
      if (error.message === 'Coupon not found') {
        res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      } else {
        logger.error('Failed to fetch coupon:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch coupon'
        });
      }
    }
  };

  /**
   * Create coupon (Admin)
   */
  createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
      const createDto = plainToClass(CreateCouponDto, req.body);
      const errors = await validate(createDto);
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid coupon data',
          errors: errors.map(e => Object.values(e.constraints || {}).join(', '))
        });
        return;
      }

      // Check if code already exists
      const existing = await this.couponService.getCouponByCode(createDto.code);
      if (existing) {
        res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
        return;
      }

      const coupon = await this.couponService.createCoupon(createDto);

      res.status(201).json({
        success: true,
        data: coupon,
        message: 'Coupon created successfully'
      });
    } catch (error) {
      logger.error('Failed to create coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create coupon'
      });
    }
  };

  /**
   * Update coupon (Admin)
   */
  updateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateDto = plainToClass(UpdateCouponDto, req.body);
      const errors = await validate(updateDto);
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid update data',
          errors: errors.map(e => Object.values(e.constraints || {}).join(', '))
        });
        return;
      }

      const coupon = await this.couponService.updateCoupon(id, updateDto);

      res.json({
        success: true,
        data: coupon,
        message: 'Coupon updated successfully'
      });
    } catch (error: any) {
      if (error.message === 'Coupon not found') {
        res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      } else {
        logger.error('Failed to update coupon:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update coupon'
        });
      }
    }
  };

  /**
   * Delete coupon (Admin)
   */
  deleteCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.couponService.deleteCoupon(id);

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error: any) {
      if (error.message === 'Coupon not found') {
        res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      } else {
        logger.error('Failed to delete coupon:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete coupon'
        });
      }
    }
  };

  /**
   * Validate coupon for customer
   */
  validateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const validateDto = plainToClass(ValidateCouponDto, {
        ...req.body,
        customerId
      });
      const errors = await validate(validateDto);
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid validation data',
          errors: errors.map(e => Object.values(e.constraints || {}).join(', '))
        });
        return;
      }

      const result = await this.couponService.validateCoupon(validateDto);

      res.json({
        success: result.valid,
        message: result.message,
        data: result.valid ? {
          discount: result.discount,
          discountType: result.discountType,
          finalAmount: validateDto.subtotal - (result.discount || 0)
        } : null
      });
    } catch (error) {
      logger.error('Failed to validate coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coupon'
      });
    }
  };

  /**
   * Get customer's available coupons
   */
  getCustomerCoupons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.id;
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
    } catch (error) {
      logger.error('Failed to fetch available coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available coupons'
      });
    }
  };

  /**
   * Get coupon usage history (Admin)
   */
  getCouponUsageHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const usages = await this.couponService.getCouponUsageHistory(id);

      res.json({
        success: true,
        data: usages
      });
    } catch (error) {
      logger.error('Failed to fetch usage history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch usage history'
      });
    }
  };

  /**
   * Bulk generate coupons (Admin)
   */
  bulkGenerateCoupons = async (req: Request, res: Response): Promise<void> => {
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

      const templateDto = plainToClass(CreateCouponDto, template);
      const errors = await validate(templateDto);
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid template data',
          errors: errors.map(e => Object.values(e.constraints || {}).join(', '))
        });
        return;
      }

      const coupons = await this.couponService.bulkGenerateCoupons(
        templateDto,
        count,
        prefix || 'BULK'
      );

      res.json({
        success: true,
        data: coupons,
        message: `${coupons.length} coupons generated successfully`
      });
    } catch (error) {
      logger.error('Failed to generate coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate coupons'
      });
    }
  };

  /**
   * Get coupon statistics (Admin)
   */
  getCouponStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statistics = await this.couponService.getCouponStatistics(id);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      if (error.message === 'Coupon not found') {
        res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      } else {
        logger.error('Failed to fetch coupon statistics:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch coupon statistics'
        });
      }
    }
  };

  /**
   * Apply coupon to order
   */
  applyCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const applyDto = plainToClass(ApplyCouponDto, {
        ...req.body,
        customerId,
        customerEmail: req.user?.email,
        customerName: req.user?.displayName || req.user?.username
      });
      const errors = await validate(applyDto);
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid coupon application data',
          errors: errors.map(e => Object.values(e.constraints || {}).join(', '))
        });
        return;
      }

      const usage = await this.couponService.applyCoupon(applyDto);

      res.json({
        success: true,
        data: usage,
        message: 'Coupon applied successfully'
      });
    } catch (error: any) {
      if (error.message.includes('Coupon')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        logger.error('Failed to apply coupon:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to apply coupon'
        });
      }
    }
  };
}