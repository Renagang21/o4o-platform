import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Product } from '../entities/Product';
import { AuthRequest } from '../types/auth';
import { CouponService } from '../services/CouponService';

export class CartController {
  private cartRepository = AppDataSource.getRepository(Cart);
  private cartItemRepository = AppDataSource.getRepository(CartItem);
  private productRepository = AppDataSource.getRepository(Product);
  private couponService = new CouponService();

  // 장바구니 조회
  getCart = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      let cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.product']
      });

      // 장바구니가 없으면 새로 생성
      if (!cart) {
        cart = this.cartRepository.create({ userId });
        cart = await this.cartRepository.save(cart);
        cart.items = [];
      }

      // 사용자 역할에 따른 가격 조정
      const userRole = (req as AuthRequest).user?.role || 'customer';
      const cartWithUserPrices = {
        ...cart,
        items: cart.items.map((item: any) => ({
          ...item,
          product: {
            ...item.product,
            price: item.product.getPriceForUser(userRole)
          }
        }))
      };

      res.json({
        success: true,
        data: cartWithUserPrices
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cart'
      });
    }
  };

  // 장바구니에 상품 추가
  addToCart = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { productId, quantity = 1 } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!productId || quantity < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid product ID or quantity'
        });
      }

      // 상품 존재 및 재고 확인
      const product = await this.productRepository.findOne({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      if (!product.isInStock()) {
        return res.status(400).json({
          success: false,
          error: 'Product is out of stock'
        });
      }

      if (product.manageStock && product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${product.stockQuantity} items available`
        });
      }

      // 장바구니 찾거나 생성
      let cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items']
      });

      if (!cart) {
        cart = this.cartRepository.create({ userId });
        cart = await this.cartRepository.save(cart);
      }

      // 이미 장바구니에 있는 상품인지 확인
      const existingItem = await this.cartItemRepository.findOne({
        where: { cartId: cart.id, productId }
      });

      const userRole = (req as AuthRequest).user?.role || 'customer';
      const priceForUser = product.getPriceForUser(userRole);

      if (existingItem) {
        // 수량 업데이트
        const newQuantity = existingItem.quantity + quantity;
        
        if (product.manageStock && product.stockQuantity < newQuantity) {
          return res.status(400).json({
            success: false,
            error: `Only ${product.stockQuantity} items available (${existingItem.quantity} already in cart)`
          });
        }

        existingItem.quantity = newQuantity;
        existingItem.price = priceForUser; // 현재 가격으로 업데이트
        await this.cartItemRepository.save(existingItem);
      } else {
        // 새 아이템 추가
        const cartItem = this.cartItemRepository.create({
          cartId: cart.id,
          productId,
          quantity,
          price: priceForUser,
          productSnapshot: {
            name: product.name,
            image: product.featuredImage || '',
            sku: product.sku
          }
        });
        await this.cartItemRepository.save(cartItem);
      }

      // 업데이트된 장바구니 반환
      const updatedCart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.product']
      });

      res.json({
        success: true,
        data: updatedCart,
        message: 'Product added to cart successfully'
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add product to cart'
      });
    }
  };

  // 장바구니 아이템 수량 수정
  updateCartItem = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be at least 1'
        });
      }

      // 장바구니 아이템 확인
      const cartItem = await this.cartItemRepository
        .createQueryBuilder('cartItem')
        .leftJoin('cartItem.cart', 'cart')
        .leftJoin('cartItem.product', 'product')
        .addSelect(['cart.userId', 'product.stockQuantity', 'product.manageStock'])
        .where('cartItem.id = :itemId', { itemId })
        .getOne();

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          error: 'Cart item not found'
        });
      }

      // 권한 확인
      if (cartItem.cart.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to cart item'
        });
      }

      // 재고 확인
      if (cartItem.product.manageStock && cartItem.product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${cartItem.product.stockQuantity} items available`
        });
      }

      // 수량 업데이트
      cartItem.quantity = quantity;
      await this.cartItemRepository.save(cartItem);

      res.json({
        success: true,
        data: cartItem,
        message: 'Cart item updated successfully'
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update cart item'
      });
    }
  };

  // 장바구니에서 아이템 제거
  removeCartItem = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { itemId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // 장바구니 아이템 확인
      const cartItem = await this.cartItemRepository
        .createQueryBuilder('cartItem')
        .leftJoin('cartItem.cart', 'cart')
        .addSelect('cart.userId')
        .where('cartItem.id = :itemId', { itemId })
        .getOne();

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          error: 'Cart item not found'
        });
      }

      // 권한 확인
      if (cartItem.cart.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to cart item'
        });
      }

      await this.cartItemRepository.remove(cartItem);

      res.json({
        success: true,
        message: 'Item removed from cart successfully'
      });
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove cart item'
      });
    }
  };

  // 장바구니 비우기
  clearCart = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items']
      });

      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      await this.cartItemRepository.remove(cart.items);

      res.json({
        success: true,
        message: 'Cart cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cart'
      });
    }
  };

  // 쿠폰 적용
  applyCoupon = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { couponCode } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          error: 'Coupon code is required'
        });
      }

      // 장바구니 조회
      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.product']
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cart is empty'
        });
      }

      // 장바구니 총액 계산
      const userRole = (req as AuthRequest).user?.role || 'customer';
      let subtotal = 0;
      const productIds: string[] = [];
      const categoryIds: string[] = [];

      cart.items.forEach((item: any) => {
        const price = item.product.getPriceForUser(userRole);
        subtotal += price * item.quantity;
        productIds.push(item.productId);
        
        // Collect category IDs if available
        if (item.product.categoryId) {
          categoryIds.push(item.product.categoryId);
        }
      });

      // 쿠폰 검증
      const validation = await this.couponService.validateCoupon({
        code: couponCode,
        customerId: userId,
        subtotal,
        productIds,
        categoryIds
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.message || 'Invalid coupon'
        });
      }

      // 쿠폰 정보 저장 (실제 주문 시 사용하기 위해)
      // Note: Cart 엔티티에 couponCode, discountAmount 필드가 필요할 수 있음
      // 현재는 응답으로만 반환
      
      const finalAmount = subtotal - (validation.discount || 0);

      res.json({
        success: true,
        data: {
          couponCode,
          subtotal,
          discount: validation.discount || 0,
          finalAmount,
          message: validation.message
        }
      });
    } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply coupon'
      });
    }
  };

  // 쿠폰 제거
  removeCoupon = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // 장바구니 조회
      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.product']
      });

      if (!cart) {
        return res.status(404).json({
          success: false,
          error: 'Cart not found'
        });
      }

      // Note: Cart 엔티티에 couponCode 필드가 있다면 여기서 null로 설정
      // cart.couponCode = null;
      // cart.discountAmount = 0;
      // await this.cartRepository.save(cart);

      res.json({
        success: true,
        message: 'Coupon removed successfully'
      });
    } catch (error) {
      console.error('Error removing coupon:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove coupon'
      });
    }
  };
}
