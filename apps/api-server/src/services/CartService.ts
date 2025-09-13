/**
 * 장바구니 서비스
 * 장바구니 관리, 재고 확인, 가격 계산 등
 */

import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { ProductVariation } from '../entities/ProductVariation';
import { Coupon } from '../entities/Coupon';
import logger from '../utils/simpleLogger';
import { Redis } from 'ioredis';

interface CartItem {
  productId: string;
  variationId?: string;
  quantity: number;
  price: number;
  compareAtPrice?: number;
  name: string;
  image?: string;
  sku?: string;
  attributes?: Record<string, any>;
  addedAt: Date;
  metadata?: Record<string, any>;
}

interface Cart {
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  shippingAddress?: any;
  billingAddress?: any;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

interface CartSummary {
  itemCount: number;
  uniqueItems: number;
  subtotal: number;
  savings: number;
  estimatedShipping: number;
  estimatedTax: number;
  total: number;
  outOfStockItems: string[];
  lowStockItems: { productId: string; available: number }[];
}

export class CartService {
  private redis: Redis;
  private readonly CART_TTL = 60 * 60 * 24 * 30; // 30일
  private readonly GUEST_CART_TTL = 60 * 60 * 24 * 7; // 7일
  
  private productRepository = AppDataSource.getRepository(Product);
  private variationRepository = AppDataSource.getRepository(ProductVariation);
  private couponRepository = AppDataSource.getRepository(Coupon);
  private userRepository = AppDataSource.getRepository(User);

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  /**
   * 장바구니 조회
   */
  async getCart(userId?: string, sessionId?: string): Promise<Cart | null> {
    const key = this.getCartKey(userId, sessionId);
    
    try {
      const cartData = await this.redis.get(key);
      
      if (!cartData) {
        return this.createEmptyCart(userId, sessionId);
      }
      
      const cart = JSON.parse(cartData) as Cart;
      
      // 재고 및 가격 검증
      await this.validateCart(cart);
      
      // 합계 재계산
      this.calculateTotals(cart);
      
      return cart;
    } catch (error) {
      logger.error('Failed to get cart:', error);
      return this.createEmptyCart(userId, sessionId);
    }
  }

  /**
   * 장바구니에 상품 추가
   */
  async addToCart(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
    variationId?: string,
    quantity: number = 1,
    metadata?: Record<string, any>
  ): Promise<Cart> {
    const cart = await this.getCart(userId, sessionId) || this.createEmptyCart(userId, sessionId);
    
    // 상품 정보 조회
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    let price = product.price;
    let compareAtPrice = product.compareAtPrice;
    let sku = product.sku;
    let attributes: Record<string, any> = {};
    let availableStock = product.stock || 0;
    
    // 변형 상품인 경우
    if (variationId) {
      const variation = await this.variationRepository.findOne({
        where: { id: variationId, productId }
      });
      
      if (!variation) {
        throw new Error('Product variation not found');
      }
      
      price = variation.price;
      compareAtPrice = variation.compareAtPrice;
      sku = variation.sku;
      attributes = variation.attributes;
      availableStock = variation.stock;
    }
    
    // 재고 확인
    if (availableStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${availableStock}`);
    }
    
    // 기존 아이템 확인
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && item.variationId === variationId
    );
    
    if (existingItemIndex >= 0) {
      // 기존 수량 증가
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (availableStock < newQuantity) {
        throw new Error(`Insufficient stock. Available: ${availableStock}`);
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // 새 아이템 추가
      const cartItem: CartItem = {
        productId,
        variationId,
        quantity,
        price,
        compareAtPrice,
        name: product.name,
        image: product.images?.[0],
        sku,
        attributes,
        addedAt: new Date(),
        metadata
      };
      
      cart.items.push(cartItem);
    }
    
    // 합계 계산
    this.calculateTotals(cart);
    
    // 저장
    await this.saveCart(cart);
    
    // 분석 데이터 수집
    this.trackCartEvent('add_to_cart', userId || sessionId, {
      productId,
      variationId,
      quantity,
      price,
      cartValue: cart.total
    });
    
    return cart;
  }

  /**
   * 장바구니 상품 수량 업데이트
   */
  async updateCartItem(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
    variationId: string | undefined,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      throw new Error('Cart not found');
    }
    
    const itemIndex = cart.items.findIndex(
      item => item.productId === productId && item.variationId === variationId
    );
    
    if (itemIndex < 0) {
      throw new Error('Item not found in cart');
    }
    
    if (quantity <= 0) {
      // 수량이 0 이하면 삭제
      cart.items.splice(itemIndex, 1);
    } else {
      // 재고 확인
      const availableStock = await this.checkStock(productId, variationId);
      
      if (availableStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${availableStock}`);
      }
      
      cart.items[itemIndex].quantity = quantity;
    }
    
    // 합계 재계산
    this.calculateTotals(cart);
    
    // 저장
    await this.saveCart(cart);
    
    return cart;
  }

  /**
   * 장바구니에서 상품 제거
   */
  async removeFromCart(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
    variationId?: string
  ): Promise<Cart> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      throw new Error('Cart not found');
    }
    
    cart.items = cart.items.filter(
      item => !(item.productId === productId && item.variationId === variationId)
    );
    
    // 합계 재계산
    this.calculateTotals(cart);
    
    // 저장
    await this.saveCart(cart);
    
    // 분석 데이터
    this.trackCartEvent('remove_from_cart', userId || sessionId, {
      productId,
      variationId,
      cartValue: cart.total
    });
    
    return cart;
  }

  /**
   * 장바구니 비우기
   */
  async clearCart(userId?: string, sessionId?: string): Promise<Cart> {
    const cart = this.createEmptyCart(userId, sessionId);
    await this.saveCart(cart);
    return cart;
  }

  /**
   * 쿠폰 적용
   */
  async applyCoupon(
    userId: string | undefined,
    sessionId: string | undefined,
    couponCode: string
  ): Promise<Cart> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      throw new Error('Cart not found');
    }
    
    // 쿠폰 조회 및 검증
    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode, isActive: true }
    });
    
    if (!coupon) {
      throw new Error('Invalid coupon code');
    }
    
    // 유효기간 확인
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new Error('Coupon is not yet valid');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new Error('Coupon has expired');
    }
    
    // 사용 횟수 확인
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit exceeded');
    }
    
    // 최소 구매 금액 확인
    if (coupon.minimumAmount && cart.subtotal < coupon.minimumAmount) {
      throw new Error(`Minimum purchase amount is ${coupon.minimumAmount}`);
    }
    
    // 할인 계산
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = cart.subtotal * (coupon.discountValue / 100);
      if (coupon.maximumDiscount) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }
    
    cart.couponCode = couponCode;
    cart.couponDiscount = discount;
    cart.discount = discount;
    
    // 합계 재계산
    this.calculateTotals(cart);
    
    // 저장
    await this.saveCart(cart);
    
    return cart;
  }

  /**
   * 쿠폰 제거
   */
  async removeCoupon(
    userId: string | undefined,
    sessionId: string | undefined
  ): Promise<Cart> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      throw new Error('Cart not found');
    }
    
    cart.couponCode = undefined;
    cart.couponDiscount = 0;
    cart.discount = 0;
    
    // 합계 재계산
    this.calculateTotals(cart);
    
    // 저장
    await this.saveCart(cart);
    
    return cart;
  }

  /**
   * 장바구니 병합 (로그인 시)
   */
  async mergeCarts(sessionId: string, userId: string): Promise<Cart> {
    const guestCart = await this.getCart(undefined, sessionId);
    const userCart = await this.getCart(userId, undefined);
    
    if (!guestCart || guestCart.items.length === 0) {
      return userCart || this.createEmptyCart(userId, undefined);
    }
    
    if (!userCart || userCart.items.length === 0) {
      // 게스트 장바구니를 사용자 장바구니로 이동
      guestCart.userId = userId;
      guestCart.sessionId = undefined;
      await this.saveCart(guestCart);
      
      // 게스트 장바구니 삭제
      await this.redis.del(this.getCartKey(undefined, sessionId));
      
      return guestCart;
    }
    
    // 두 장바구니 병합
    for (const guestItem of guestCart.items) {
      const existingIndex = userCart.items.findIndex(
        item => item.productId === guestItem.productId && 
                item.variationId === guestItem.variationId
      );
      
      if (existingIndex >= 0) {
        // 수량 합산
        userCart.items[existingIndex].quantity += guestItem.quantity;
      } else {
        // 새 아이템 추가
        userCart.items.push(guestItem);
      }
    }
    
    // 쿠폰 유지 (사용자 장바구니 우선)
    if (!userCart.couponCode && guestCart.couponCode) {
      userCart.couponCode = guestCart.couponCode;
      userCart.couponDiscount = guestCart.couponDiscount;
    }
    
    // 합계 재계산
    this.calculateTotals(userCart);
    
    // 저장
    await this.saveCart(userCart);
    
    // 게스트 장바구니 삭제
    await this.redis.del(this.getCartKey(undefined, sessionId));
    
    return userCart;
  }

  /**
   * 장바구니 요약 정보
   */
  async getCartSummary(
    userId?: string,
    sessionId?: string
  ): Promise<CartSummary> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      return {
        itemCount: 0,
        uniqueItems: 0,
        subtotal: 0,
        savings: 0,
        estimatedShipping: 0,
        estimatedTax: 0,
        total: 0,
        outOfStockItems: [],
        lowStockItems: []
      };
    }
    
    const outOfStockItems: string[] = [];
    const lowStockItems: { productId: string; available: number }[] = [];
    let savings = 0;
    
    // 재고 확인 및 절약 금액 계산
    for (const item of cart.items) {
      const stock = await this.checkStock(item.productId, item.variationId);
      
      if (stock === 0) {
        outOfStockItems.push(item.productId);
      } else if (stock < item.quantity) {
        lowStockItems.push({
          productId: item.productId,
          available: stock
        });
      }
      
      if (item.compareAtPrice && item.compareAtPrice > item.price) {
        savings += (item.compareAtPrice - item.price) * item.quantity;
      }
    }
    
    return {
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueItems: cart.items.length,
      subtotal: cart.subtotal,
      savings: savings + (cart.couponDiscount || 0),
      estimatedShipping: cart.shipping,
      estimatedTax: cart.tax,
      total: cart.total,
      outOfStockItems,
      lowStockItems
    };
  }

  /**
   * 장바구니 검증
   */
  private async validateCart(cart: Cart): Promise<void> {
    const itemsToRemove: number[] = [];
    
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      
      // 상품 존재 확인
      const product = await this.productRepository.findOne({
        where: { id: item.productId }
      });
      
      if (!product) {
        itemsToRemove.push(i);
        continue;
      }
      
      // 가격 업데이트
      if (item.variationId) {
        const variation = await this.variationRepository.findOne({
          where: { id: item.variationId }
        });
        
        if (variation) {
          item.price = variation.price;
          item.compareAtPrice = variation.compareAtPrice;
        }
      } else {
        item.price = product.price;
        item.compareAtPrice = product.compareAtPrice;
      }
    }
    
    // 유효하지 않은 아이템 제거
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
      cart.items.splice(itemsToRemove[i], 1);
    }
  }

  /**
   * 합계 계산
   */
  private calculateTotals(cart: Cart): void {
    // 소계
    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    
    // 배송비 계산 (예: 50000원 이상 무료)
    cart.shipping = cart.subtotal >= 50000 ? 0 : 3000;
    
    // 세금 계산 (VAT 10%)
    cart.tax = Math.round(cart.subtotal * 0.1);
    
    // 총액
    cart.total = cart.subtotal + cart.shipping + cart.tax - (cart.couponDiscount || 0);
    
    cart.updatedAt = new Date();
  }

  /**
   * 재고 확인
   */
  private async checkStock(productId: string, variationId?: string): Promise<number> {
    if (variationId) {
      const variation = await this.variationRepository.findOne({
        where: { id: variationId }
      });
      return variation?.stock || 0;
    }
    
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });
    return product?.stock || 0;
  }

  /**
   * 장바구니 저장
   */
  private async saveCart(cart: Cart): Promise<void> {
    const key = this.getCartKey(cart.userId, cart.sessionId);
    const ttl = cart.userId ? this.CART_TTL : this.GUEST_CART_TTL;
    
    await this.redis.setex(key, ttl, JSON.stringify(cart));
  }

  /**
   * 장바구니 키 생성
   */
  private getCartKey(userId?: string, sessionId?: string): string {
    if (userId) {
      return `cart:user:${userId}`;
    }
    if (sessionId) {
      return `cart:session:${sessionId}`;
    }
    throw new Error('Either userId or sessionId is required');
  }

  /**
   * 빈 장바구니 생성
   */
  private createEmptyCart(userId?: string, sessionId?: string): Cart {
    return {
      userId,
      sessionId,
      items: [],
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 장바구니 이벤트 추적
   */
  private trackCartEvent(
    event: string,
    identifier: string | undefined,
    data: Record<string, any>
  ): void {
    logger.info(`Cart event: ${event}`, {
      identifier,
      ...data
    });
    
    // 분석 서비스로 전송 (구현 필요)
  }

  /**
   * 장바구니 복구 (abandoned cart)
   */
  async getAbandonedCarts(hours: number = 24): Promise<Cart[]> {
    // Redis에서 일정 시간 이상 업데이트되지 않은 장바구니 조회
    const abandonedCarts: Cart[] = [];
    
    // 실제 구현 시 Redis SCAN 명령어 사용
    logger.info(`Checking for abandoned carts older than ${hours} hours`);
    
    return abandonedCarts;
  }

  /**
   * 장바구니 리마인더 이메일
   */
  async sendCartReminder(cart: Cart): Promise<void> {
    if (!cart.userId) return;
    
    const user = await this.userRepository.findOne({
      where: { id: cart.userId }
    });
    
    if (!user?.email) return;
    
    // 이메일 발송 (EmailService 연동)
    logger.info(`Sending cart reminder to ${user.email}`);
  }
}

// 싱글톤 인스턴스
export const cartService = new CartService();