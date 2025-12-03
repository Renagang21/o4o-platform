import { AppDataSource } from '../../../config/database.js';
import { Cart } from '../entities/Cart.js';
import { CartItem } from '../entities/CartItem.js';
import { BaseService } from '../../../common/base.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * CartService
 * NextGen V2 - BaseService pattern
 * Handles cart and cart item operations
 */
export class CartService extends BaseService<Cart> {
  private static instance: CartService;
  private cartItemRepo = AppDataSource.getRepository(CartItem);

  constructor() {
    super(Cart);
  }

  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  async getCartByUserId(userId: string): Promise<Cart | null> {
    try {
      return await this.repo.findOne({
        where: { userId },
        relations: ['items'],
      });
    } catch (error: any) {
      logger.error('[CartService.getCartByUserId] Error', {
        error: error.message,
        userId,
      });
      throw new Error('Failed to get cart');
    }
  }

  async createCart(userId: string): Promise<Cart> {
    try {
      const cart = this.repo.create({
        userId,
        items: [],
        coupons: [],
        discountCodes: [],
      });
      return await this.repo.save(cart);
    } catch (error: any) {
      logger.error('[CartService.createCart] Error', {
        error: error.message,
        userId,
      });
      throw new Error('Failed to create cart');
    }
  }

  async addItemToCart(
    cartId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    productName: string,
    productSku: string,
    productImage?: string,
    supplierId?: string,
    supplierName?: string
  ): Promise<CartItem> {
    try {
      // Check if item already exists
      const existingItem = await this.cartItemRepo.findOne({
        where: { cartId, productId },
      });

      if (existingItem) {
        existingItem.quantity += quantity;
        return await this.cartItemRepo.save(existingItem);
      }

      // Create new cart item
      const cartItem = this.cartItemRepo.create({
        cartId,
        productId,
        quantity,
        unitPrice,
        productName,
        productSku,
        productImage,
        supplierId,
        supplierName,
        addedAt: new Date(),
      });

      return await this.cartItemRepo.save(cartItem);
    } catch (error: any) {
      logger.error('[CartService.addItemToCart] Error', {
        error: error.message,
        cartId,
        productId,
      });
      throw new Error('Failed to add item to cart');
    }
  }

  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<CartItem> {
    try {
      const cartItem = await this.cartItemRepo.findOne({
        where: { id: cartItemId },
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      if (quantity === 0) {
        await this.cartItemRepo.remove(cartItem);
        return cartItem;
      }

      cartItem.quantity = quantity;
      return await this.cartItemRepo.save(cartItem);
    } catch (error: any) {
      logger.error('[CartService.updateCartItemQuantity] Error', {
        error: error.message,
        cartItemId,
      });
      throw error;
    }
  }

  async removeCartItem(cartItemId: string): Promise<void> {
    try {
      await this.cartItemRepo.delete(cartItemId);
    } catch (error: any) {
      logger.error('[CartService.removeCartItem] Error', {
        error: error.message,
        cartItemId,
      });
      throw new Error('Failed to remove cart item');
    }
  }

  async clearCart(cartId: string): Promise<void> {
    try {
      await this.cartItemRepo.delete({ cartId });
    } catch (error: any) {
      logger.error('[CartService.clearCart] Error', {
        error: error.message,
        cartId,
      });
      throw new Error('Failed to clear cart');
    }
  }
}
