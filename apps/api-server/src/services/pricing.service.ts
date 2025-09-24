import { AppDataSource } from '../database/connection';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { Coupon, CouponDiscountType } from '../entities/Coupon';
import { Repository } from 'typeorm';

export interface TaxRate {
  country: string;
  state?: string;
  rate: number;
  type: 'VAT' | 'SALES_TAX' | 'GST';
}

export interface DiscountRule {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'BULK';
  value: number;
  minQuantity?: number;
  maxDiscount?: number;
}

export interface PricingResult {
  basePrice: number;
  discountAmount: number;
  discountPercentage: number;
  taxAmount: number;
  taxRate: number;
  shippingCost: number;
  finalPrice: number;
  breakdown: {
    subtotal: number;
    discount: number;
    taxableAmount: number;
    tax: number;
    shipping: number;
    total: number;
  };
}

export class PricingService {
  private productRepository: Repository<Product>;
  private userRepository: Repository<User>;
  private couponRepository: Repository<Coupon>;

  // Korean tax rates
  private static readonly TAX_RATES: Record<string, TaxRate> = {
    KR: { country: 'KR', rate: 0.10, type: 'VAT' }, // 10% VAT in Korea
    US: { country: 'US', rate: 0.0875, type: 'SALES_TAX' }, // Average US sales tax
    JP: { country: 'JP', rate: 0.10, type: 'GST' }, // 10% consumption tax in Japan
    CN: { country: 'CN', rate: 0.13, type: 'VAT' }, // 13% VAT in China
    DEFAULT: { country: 'DEFAULT', rate: 0.10, type: 'VAT' }
  };

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.userRepository = AppDataSource.getRepository(User);
    this.couponRepository = AppDataSource.getRepository(Coupon);
  }

  /**
   * Calculate full pricing for a product
   */
  async calculatePrice(
    productId: string,
    quantity: number,
    userId?: string,
    couponCode?: string,
    shippingAddress?: { country: string; state?: string }
  ): Promise<PricingResult> {
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Get base price based on user role
    let basePrice = product.retailPrice;
    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });
      if (user) {
        basePrice = this.getPriceByUserRole(product, user.role);
      }
    }

    const subtotal = basePrice * quantity;

    // Calculate discounts
    let discountAmount = 0;
    let discountPercentage = 0;

    // Apply quantity discount
    const quantityDiscount = this.calculateQuantityDiscount(subtotal, quantity);
    discountAmount += quantityDiscount.amount;

    // Apply coupon discount
    if (couponCode) {
      const couponDiscount = await this.applyCoupon(couponCode, subtotal - discountAmount);
      discountAmount += couponDiscount.amount;
    }

    // Apply seasonal discount
    const seasonalDiscount = this.calculateSeasonalDiscount(subtotal - discountAmount);
    discountAmount += seasonalDiscount.amount;

    // Calculate discount percentage
    if (discountAmount > 0) {
      discountPercentage = (discountAmount / subtotal) * 100;
    }

    // Calculate taxable amount
    const taxableAmount = subtotal - discountAmount;

    // Calculate tax
    const taxRate = this.getTaxRate(shippingAddress?.country || 'KR');
    const taxAmount = taxableAmount * taxRate.rate;

    // Calculate shipping
    const shippingCost = this.calculateShipping(
      product,
      quantity,
      shippingAddress?.country || 'KR'
    );

    // Calculate final price
    const finalPrice = taxableAmount + taxAmount + shippingCost;

    return {
      basePrice,
      discountAmount,
      discountPercentage,
      taxAmount,
      taxRate: taxRate.rate,
      shippingCost,
      finalPrice,
      breakdown: {
        subtotal,
        discount: discountAmount,
        taxableAmount,
        tax: taxAmount,
        shipping: shippingCost,
        total: finalPrice
      }
    };
  }

  /**
   * Calculate cart total with multiple products
   */
  async calculateCartTotal(
    items: Array<{ productId: string; quantity: number }>,
    userId?: string,
    couponCode?: string,
    shippingAddress?: { country: string; state?: string }
  ): Promise<{
    items: Array<{ productId: string; pricing: PricingResult }>;
    totals: {
      subtotal: number;
      totalDiscount: number;
      totalTax: number;
      totalShipping: number;
      grandTotal: number;
    };
  }> {
    const itemPricing = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalShipping = 0;

    // Calculate individual item prices
    for (const item of items) {
      const pricing = await this.calculatePrice(
        item.productId,
        item.quantity,
        userId,
        undefined, // Don't apply coupon per item
        shippingAddress
      );
      
      itemPricing.push({
        productId: item.productId,
        pricing
      });

      subtotal += pricing.breakdown.subtotal;
      totalDiscount += pricing.discountAmount;
      totalTax += pricing.taxAmount;
    }

    // Apply cart-level coupon
    if (couponCode) {
      const cartDiscount = await this.applyCoupon(
        couponCode,
        subtotal - totalDiscount
      );
      totalDiscount += cartDiscount.amount;
    }

    // Calculate combined shipping (may be cheaper than individual)
    totalShipping = await this.calculateCombinedShipping(
      items,
      shippingAddress?.country || 'KR'
    );

    const grandTotal = subtotal - totalDiscount + totalTax + totalShipping;

    return {
      items: itemPricing,
      totals: {
        subtotal,
        totalDiscount,
        totalTax,
        totalShipping,
        grandTotal
      }
    };
  }

  /**
   * Get price based on user role
   */
  private getPriceByUserRole(product: Product, userRole: string): number {
    switch (userRole) {
      case 'business':
      case 'vendor':
        return product.wholesalePrice || product.retailPrice;
      case 'affiliate':
        return product.affiliatePrice || product.retailPrice;
      default:
        return product.salePrice || product.retailPrice;
    }
  }

  /**
   * Calculate quantity-based discount
   */
  private calculateQuantityDiscount(
    subtotal: number,
    quantity: number
  ): { amount: number; percentage: number } {
    let discountPercentage = 0;

    // Bulk discount tiers
    if (quantity >= 100) {
      discountPercentage = 0.20; // 20% off for 100+ items
    } else if (quantity >= 50) {
      discountPercentage = 0.15; // 15% off for 50+ items
    } else if (quantity >= 20) {
      discountPercentage = 0.10; // 10% off for 20+ items
    } else if (quantity >= 10) {
      discountPercentage = 0.05; // 5% off for 10+ items
    }

    const amount = subtotal * discountPercentage;

    return {
      amount,
      percentage: discountPercentage * 100
    };
  }

  /**
   * Apply coupon discount
   */
  private async applyCoupon(
    couponCode: string,
    amount: number
  ): Promise<{ amount: number; percentage: number }> {
    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode }
    });

    if (!coupon || !coupon.isValid()) {
      return { amount: 0, percentage: 0 };
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
      return { amount: 0, percentage: 0 };
    }

    // Calculate discount using the coupon's method
    const discountAmount = coupon.calculateDiscount(amount);
    const discountPercentage = amount > 0 ? (discountAmount / amount) * 100 : 0;

    return {
      amount: discountAmount,
      percentage: discountPercentage
    };
  }

  /**
   * Calculate seasonal discount
   */
  private calculateSeasonalDiscount(
    amount: number
  ): { amount: number; percentage: number } {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    let discountPercentage = 0;

    // Korean shopping seasons
    if (month === 11 && day >= 1 && day <= 11) {
      // 11.11 Day (Pepero Day)
      discountPercentage = 0.11;
    } else if (month === 10 && day === 10) {
      // 10.10 Day
      discountPercentage = 0.10;
    } else if (month === 5 && day >= 1 && day <= 7) {
      // Children's Day week
      discountPercentage = 0.15;
    } else if (month === 9 && day >= 20 && day <= 30) {
      // Chuseok season
      discountPercentage = 0.10;
    } else if ((month === 1 && day >= 20) || (month === 2 && day <= 10)) {
      // Lunar New Year season
      discountPercentage = 0.10;
    } else if (month === 12 && day >= 20) {
      // Year-end sale
      discountPercentage = 0.20;
    }

    const discountAmount = amount * discountPercentage;

    return {
      amount: discountAmount,
      percentage: discountPercentage * 100
    };
  }

  /**
   * Get tax rate for country
   */
  private getTaxRate(country: string): TaxRate {
    return PricingService.TAX_RATES[country] || PricingService.TAX_RATES.DEFAULT;
  }

  /**
   * Calculate shipping cost
   */
  private calculateShipping(
    product: Product,
    quantity: number,
    country: string
  ): number {
    if (!product.requiresShipping) {
      return 0;
    }

    const weight = (product.weight || 0) * quantity;
    let baseCost = 0;

    // Domestic (Korea) shipping
    if (country === 'KR') {
      if (weight <= 1) {
        baseCost = 3000; // 3,000 KRW for <= 1kg
      } else if (weight <= 5) {
        baseCost = 4000; // 4,000 KRW for <= 5kg
      } else if (weight <= 10) {
        baseCost = 5000; // 5,000 KRW for <= 10kg
      } else {
        baseCost = 5000 + ((weight - 10) * 500); // +500 KRW per kg over 10kg
      }

      // Free shipping for orders over 50,000 KRW
      if (product.retailPrice * quantity >= 50000) {
        return 0;
      }
    } else {
      // International shipping
      const zones: Record<string, number> = {
        JP: 15000, // Japan
        CN: 12000, // China
        US: 25000, // USA
        DEFAULT: 20000 // Other countries
      };

      baseCost = zones[country] || zones.DEFAULT;
      
      // Add weight-based cost for international
      if (weight > 1) {
        baseCost += (weight - 1) * 2000; // +2,000 KRW per kg
      }
    }

    return baseCost;
  }

  /**
   * Calculate combined shipping for multiple items
   */
  private async calculateCombinedShipping(
    items: Array<{ productId: string; quantity: number }>,
    country: string
  ): Promise<number> {
    let totalWeight = 0;
    let requiresShipping = false;
    let maxShippingCost = 0;

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId }
      });

      if (product && product.requiresShipping) {
        requiresShipping = true;
        totalWeight += (product.weight || 0) * item.quantity;
        
        // Track the highest individual shipping cost
        const individualCost = this.calculateShipping(product, item.quantity, country);
        maxShippingCost = Math.max(maxShippingCost, individualCost);
      }
    }

    if (!requiresShipping) {
      return 0;
    }

    // Calculate combined shipping (usually cheaper than sum of individual)
    let combinedCost = 0;

    if (country === 'KR') {
      if (totalWeight <= 1) {
        combinedCost = 3000;
      } else if (totalWeight <= 5) {
        combinedCost = 4000;
      } else if (totalWeight <= 10) {
        combinedCost = 5000;
      } else {
        combinedCost = 5000 + ((totalWeight - 10) * 400); // Slightly cheaper per kg for combined
      }
    } else {
      const zones: Record<string, number> = {
        JP: 15000,
        CN: 12000,
        US: 25000,
        DEFAULT: 20000
      };

      combinedCost = zones[country] || zones.DEFAULT;
      
      if (totalWeight > 1) {
        combinedCost += (totalWeight - 1) * 1500; // Cheaper per kg for combined international
      }
    }

    // Use the cheaper option between combined and highest individual cost
    return Math.min(combinedCost, maxShippingCost);
  }

  /**
   * Validate and format pricing for display
   */
  formatPrice(amount: number, currency: string = 'KRW'): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}