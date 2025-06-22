import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { Order, OrderStatus, PaymentStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Product } from '../entities/Product';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export class OrdersController {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private cartRepository = AppDataSource.getRepository(Cart);
  private cartItemRepository = AppDataSource.getRepository(CartItem);
  private productRepository = AppDataSource.getRepository(Product);

  // 주문 목록 조회
  getOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const queryBuilder = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where('order.userId = :userId', { userId });

      if (status) {
        queryBuilder.andWhere('order.status = :status', { status });
      }

      queryBuilder
        .orderBy('order.createdAt', 'DESC')
        .skip(skip)
        .take(Number(limit));

      const [orders, totalCount] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch orders'
      });
    }
  };

  // 주문 상세 조회
  getOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const order = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where('order.id = :id', { id })
        .andWhere('order.userId = :userId', { userId })
        .getOne();

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  };

  // 주문 생성 (장바구니에서)
  createOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { shippingAddress, billingAddress, notes } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!shippingAddress) {
        return res.status(400).json({
          success: false,
          error: 'Shipping address is required'
        });
      }

      // 장바구니 조회
      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.product']
      });

      if (!cart || cart.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Cart is empty'
        });
      }

      // 재고 확인
      for (const cartItem of cart.items) {
        if (!cartItem.product.isInStock()) {
          return res.status(400).json({
            success: false,
            error: `Product ${cartItem.product.name} is out of stock`
          });
        }

        if (cartItem.product.manageStock && 
            cartItem.product.stockQuantity < cartItem.quantity) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for ${cartItem.product.name}`
          });
        }
      }

      // 트랜잭션 시작
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 주문 생성
        const order = new Order();
        order.orderNumber = order.generateOrderNumber();
        order.userId = userId;
        order.status = OrderStatus.PENDING;
        order.paymentStatus = PaymentStatus.PENDING;
        order.shippingAddress = shippingAddress;
        order.billingAddress = billingAddress || shippingAddress;
        order.notes = notes;

        // 금액 계산
        order.subtotal = cart.getTotalPrice();
        order.taxAmount = 0; // TODO: 세금 계산 로직
        order.shippingFee = 0; // TODO: 배송비 계산 로직
        order.discountAmount = 0; // TODO: 할인 계산 로직
        order.totalAmount = order.subtotal + order.taxAmount + order.shippingFee - order.discountAmount;

        const savedOrder = await queryRunner.manager.save(order);

        // 주문 아이템 생성
        for (const cartItem of cart.items) {
          const orderItem = new OrderItem();
          orderItem.orderId = savedOrder.id;
          orderItem.productId = cartItem.productId;
          orderItem.quantity = cartItem.quantity;
          orderItem.unitPrice = cartItem.price;
          orderItem.totalPrice = cartItem.price * cartItem.quantity;
          orderItem.productSnapshot = {
            name: cartItem.product.name,
            sku: cartItem.product.sku,
            image: cartItem.product.featuredImage || '',
            description: cartItem.product.shortDescription
          };

          await queryRunner.manager.save(orderItem);

          // 재고 차감 (재고 관리하는 상품만)
          if (cartItem.product.manageStock) {
            await queryRunner.manager.update(Product, cartItem.productId, {
              stockQuantity: cartItem.product.stockQuantity - cartItem.quantity
            });
          }
        }

        // 장바구니 비우기
        await queryRunner.manager.remove(cart.items);

        await queryRunner.commitTransaction();

        // 생성된 주문 조회
        const createdOrder = await this.orderRepository
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.items', 'items')
          .leftJoinAndSelect('items.product', 'product')
          .where('order.id = :id', { id: savedOrder.id })
          .getOne();

        res.status(201).json({
          success: true,
          data: createdOrder,
          message: 'Order created successfully'
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create order'
      });
    }
  };

  // 주문 취소
  cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const order = await this.orderRepository.findOne({
        where: { id, userId },
        relations: ['items', 'items.product']
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      if (!order.canCancel()) {
        return res.status(400).json({
          success: false,
          error: 'Order cannot be cancelled'
        });
      }

      // 트랜잭션으로 재고 복구 및 상태 변경
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 재고 복구
        for (const orderItem of order.items) {
          if (orderItem.product.manageStock) {
            await queryRunner.manager.update(Product, orderItem.productId, {
              stockQuantity: orderItem.product.stockQuantity + orderItem.quantity
            });
          }
        }

        // 주문 상태 변경
        await queryRunner.manager.update(Order, id, {
          status: OrderStatus.CANCELLED
        });

        await queryRunner.commitTransaction();

        res.json({
          success: true,
          message: 'Order cancelled successfully'
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel order'
      });
    }
  };
}
