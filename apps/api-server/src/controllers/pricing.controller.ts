import { Request, Response } from 'express';
import { PricingService } from '../services/pricing.service';
import { AuthRequest } from '../types/auth';

export class PricingController {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  /**
   * Calculate price for a single product
   */
  async calculateProductPrice(req: Request, res: Response): Promise<void> {
    try {
      const {
        productId,
        quantity = 1,
        couponCode,
        shippingAddress
      } = req.body;

      if (!productId) {
        res.status(400).json({
          error: 'Product ID is required'
        });
        return;
      }

      const userId = (req as AuthRequest).user?.id;

      const pricing = await this.pricingService.calculatePrice(
        productId,
        quantity,
        userId,
        couponCode,
        shippingAddress
      );

      res.json({
        success: true,
        pricing
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to calculate price',
        message: error.message
      });
    }
  }

  /**
   * Calculate cart total
   */
  async calculateCartTotal(req: Request, res: Response): Promise<void> {
    try {
      const {
        items,
        couponCode,
        shippingAddress
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: 'Cart items are required'
        });
        return;
      }

      const userId = (req as AuthRequest).user?.id;

      const cartTotals = await this.pricingService.calculateCartTotal(
        items,
        userId,
        couponCode,
        shippingAddress
      );

      res.json({
        success: true,
        ...cartTotals
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to calculate cart total',
        message: error.message
      });
    }
  }

  /**
   * Get tax rate for a country
   */
  async getTaxRate(req: Request, res: Response): Promise<void> {
    try {
      const { country = 'KR', state } = req.query;

      // Use the private method through reflection (for demonstration)
      // In production, you'd expose this through the service
      const taxRates = {
        KR: { country: 'KR', rate: 0.10, type: 'VAT' },
        US: { country: 'US', rate: 0.0875, type: 'SALES_TAX' },
        JP: { country: 'JP', rate: 0.10, type: 'GST' },
        CN: { country: 'CN', rate: 0.13, type: 'VAT' },
        DEFAULT: { country: 'DEFAULT', rate: 0.10, type: 'VAT' }
      };

      const taxRate = taxRates[country as string] || taxRates.DEFAULT;

      res.json({
        success: true,
        taxRate
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get tax rate',
        message: error.message
      });
    }
  }

  /**
   * Validate coupon
   */
  async validateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { couponCode, amount = 0 } = req.body;

      if (!couponCode) {
        res.status(400).json({
          error: 'Coupon code is required'
        });
        return;
      }

      // This would normally be exposed through the service
      const result = await (this.pricingService as any).applyCoupon(
        couponCode,
        amount
      );

      const isValid = result.amount > 0;

      res.json({
        success: true,
        valid: isValid,
        discount: result
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to validate coupon',
        message: error.message
      });
    }
  }

  /**
   * Calculate shipping cost
   */
  async calculateShipping(req: Request, res: Response): Promise<void> {
    try {
      const {
        items,
        shippingAddress = { country: 'KR' }
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: 'Items are required'
        });
        return;
      }

      // Calculate shipping for cart items
      const shippingCost = await (this.pricingService as any).calculateCombinedShipping(
        items,
        shippingAddress.country
      );

      res.json({
        success: true,
        shippingCost,
        country: shippingAddress.country
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to calculate shipping',
        message: error.message
      });
    }
  }

  /**
   * Get pricing breakdown for order review
   */
  async getPricingBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const {
        items,
        couponCode,
        shippingAddress = { country: 'KR' }
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: 'Items are required'
        });
        return;
      }

      const userId = (req as AuthRequest).user?.id;

      const cartTotals = await this.pricingService.calculateCartTotal(
        items,
        userId,
        couponCode,
        shippingAddress
      );

      // Format prices for display
      const formatter = new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      });

      const formattedBreakdown = {
        items: cartTotals.items.map(item => ({
          productId: item.productId,
          pricing: {
            ...item.pricing,
            formattedPrice: formatter.format(item.pricing.finalPrice),
            formattedDiscount: formatter.format(item.pricing.discountAmount),
            formattedTax: formatter.format(item.pricing.taxAmount)
          }
        })),
        totals: {
          ...cartTotals.totals,
          formatted: {
            subtotal: formatter.format(cartTotals.totals.subtotal),
            totalDiscount: formatter.format(cartTotals.totals.totalDiscount),
            totalTax: formatter.format(cartTotals.totals.totalTax),
            totalShipping: formatter.format(cartTotals.totals.totalShipping),
            grandTotal: formatter.format(cartTotals.totals.grandTotal)
          }
        }
      };

      res.json({
        success: true,
        breakdown: formattedBreakdown
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get pricing breakdown',
        message: error.message
      });
    }
  }
}