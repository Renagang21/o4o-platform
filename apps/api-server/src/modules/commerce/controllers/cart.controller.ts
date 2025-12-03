import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CartService } from '../services/CartService.js';
import { AddToCartDto, UpdateCartDto } from '../dto/index.js';
import { logger } from '../../../utils/logger.js';
import type { AuthRequest } from '../../../types/express.js';

/**
 * CartController
 * NextGen V2 - Commerce Module
 * Handles cart operations
 */
export class CartController extends BaseController {
  static async getCart(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const cartService = CartService.getInstance();
      let cart = await cartService.getCartByUserId(req.user.id);

      if (!cart) {
        cart = await cartService.createCart(req.user.id);
      }

      return BaseController.ok(res, { cart });
    } catch (error: any) {
      logger.error('[CartController.getCart] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async addToCart(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as AddToCartDto;
      const cartService = CartService.getInstance();

      let cart = await cartService.getCartByUserId(req.user.id);
      if (!cart) {
        cart = await cartService.createCart(req.user.id);
      }

      // TODO: Fetch product details from ProductService
      const cartItem = await cartService.addItemToCart(
        cart.id,
        data.productId,
        data.quantity,
        0, // unitPrice - should be fetched from product
        'Product Name', // should be fetched from product
        'SKU', // should be fetched from product
      );

      return BaseController.ok(res, { cartItem });
    } catch (error: any) {
      logger.error('[CartController.addToCart] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateCartItem(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as UpdateCartDto;
      const cartService = CartService.getInstance();

      const cartItem = await cartService.updateCartItemQuantity(
        data.cartItemId,
        data.quantity
      );

      return BaseController.ok(res, { cartItem });
    } catch (error: any) {
      logger.error('[CartController.updateCartItem] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async removeCartItem(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { itemId } = req.params;
      const cartService = CartService.getInstance();

      await cartService.removeCartItem(itemId);

      return BaseController.ok(res, { message: 'Item removed from cart' });
    } catch (error: any) {
      logger.error('[CartController.removeCartItem] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async clearCart(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const cartService = CartService.getInstance();
      const cart = await cartService.getCartByUserId(req.user.id);

      if (!cart) {
        return BaseController.notFound(res, 'Cart not found');
      }

      await cartService.clearCart(cart.id);

      return BaseController.ok(res, { message: 'Cart cleared' });
    } catch (error: any) {
      logger.error('[CartController.clearCart] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }
}
