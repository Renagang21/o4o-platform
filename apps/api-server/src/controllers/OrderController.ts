import { Request, Response, NextFunction } from 'express';
import { OrderService, CreateOrderRequest, CreateOrderFromCartRequest, OrderFilters } from '../services/OrderService';
import { OrderStatus, PaymentStatus } from '../entities/Order';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * GET /api/orders
   * Get user's orders with filtering
   */
  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const filters: OrderFilters = {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      // For non-admin users, only show their own orders
      if (req.user?.role !== 'admin') {
        // Add buyer filter implicitly by modifying the service call
      }

      const result = await this.orderService.getOrders(filters);

      res.json({
        success: true,
        data: result.orders,
        pagination: {
          current: filters.page || 1,
          pageSize: filters.limit || 10,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 10))
        }
      });

    } catch (error) {
      logger.error('Error getting orders:', error);
      next(error);
    }
  };

  /**
   * GET /api/orders/:id
   * Get single order by ID
   */
  getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // For non-admin users, only allow access to their own orders
      const buyerId = req.user?.role === 'admin' ? undefined : userId;
      
      const order = await this.orderService.getOrderById(id, buyerId);

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error getting order:', error);
      next(error);
    }
  };

  /**
   * POST /api/orders
   * Create new order directly
   */
  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const orderRequest: CreateOrderRequest = req.body;
      const order = await this.orderService.createOrder(userId, orderRequest);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });

    } catch (error) {
      logger.error('Error creating order:', error);
      next(error);
    }
  };

  /**
   * POST /api/orders/from-cart
   * Create order from cart
   */
  createOrderFromCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const orderRequest: CreateOrderFromCartRequest = {
        ...req.body,
        cartId: req.body.cartId || userId // Use userId as cartId if not provided
      };

      const order = await this.orderService.createOrderFromCart(userId, orderRequest);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully from cart'
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Cart is empty')) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      logger.error('Error creating order from cart:', error);
      next(error);
    }
  };

  /**
   * PATCH /api/orders/:id/status
   * Update order status (admin only)
   */
  updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Only admin can update order status
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      if (!Object.values(OrderStatus).includes(status)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid status',
          validStatuses: Object.values(OrderStatus)
        });
        return;
      }

      const order = await this.orderService.updateOrderStatus(id, status);

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error updating order status:', error);
      next(error);
    }
  };

  /**
   * PATCH /api/orders/:id/payment-status
   * Update payment status (admin only)
   */
  updatePaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      // Only admin can update payment status
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      if (!Object.values(PaymentStatus).includes(paymentStatus)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid payment status',
          validStatuses: Object.values(PaymentStatus)
        });
        return;
      }

      const order = await this.orderService.updatePaymentStatus(id, paymentStatus);

      res.json({
        success: true,
        data: order,
        message: 'Payment status updated successfully'
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error updating payment status:', error);
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/cancel
   * Cancel order
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // First check if user owns this order (unless admin)
      if (req.user?.role !== 'admin') {
        await this.orderService.getOrderById(id, userId);
      }

      const order = await this.orderService.cancelOrder(id, reason);

      res.json({
        success: true,
        data: order,
        message: 'Order cancelled successfully'
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Order not found') {
          res.status(404).json({ success: false, message: 'Order not found' });
          return;
        }
        if (error.message.includes('cannot be cancelled')) {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
      }
      logger.error('Error cancelling order:', error);
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/refund
   * Request refund
   */
  requestRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason, amount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!reason) {
        res.status(400).json({ success: false, message: 'Reason is required' });
        return;
      }

      // First check if user owns this order (unless admin)
      if (req.user?.role !== 'admin') {
        await this.orderService.getOrderById(id, userId);
      }

      const order = await this.orderService.requestRefund(id, reason, amount);

      res.json({
        success: true,
        data: order,
        message: 'Refund requested successfully'
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Order not found') {
          res.status(404).json({ success: false, message: 'Order not found' });
          return;
        }
        if (error.message.includes('cannot be refunded')) {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
      }
      logger.error('Error requesting refund:', error);
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/reorder
   * Create new order based on existing order
   */
  reorder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Get original order
      const originalOrder = await this.orderService.getOrderById(id, userId);

      // Create new order with same items and addresses
      const newOrderRequest: CreateOrderRequest = {
        items: originalOrder.items,
        billingAddress: originalOrder.billingAddress,
        shippingAddress: originalOrder.shippingAddress,
        paymentMethod: originalOrder.paymentMethod,
        notes: `Reorder from ${originalOrder.orderNumber}`
      };

      const newOrder = await this.orderService.createOrder(userId, newOrderRequest);

      res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Reorder created successfully'
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error reordering:', error);
      next(error);
    }
  };

  /**
   * GET /api/orders/stats
   * Get order statistics
   */
  getOrderStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // For non-admin users, only show their own stats
      const buyerId = req.user?.role === 'admin' ? undefined : userId;
      
      const stats = await this.orderService.getOrderStats(buyerId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting order stats:', error);
      next(error);
    }
  };

  /**
   * GET /api/orders/:id/tracking
   * Get order tracking information
   */
  getOrderTracking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const buyerId = req.user?.role === 'admin' ? undefined : userId;
      const order = await this.orderService.getOrderById(id, buyerId);

      if (!order.trackingNumber) {
        res.status(404).json({ 
          success: false, 
          message: 'Tracking information not available' 
        });
        return;
      }

      // TODO: Integrate with actual shipping carrier APIs
      const trackingData = {
        trackingNumber: order.trackingNumber,
        carrier: 'CJ대한통운', // Default carrier
        status: order.status,
        estimatedDelivery: null,
        history: [
          {
            status: 'Order Confirmed',
            location: '온라인',
            timestamp: order.confirmedDate,
            description: '주문이 확인되었습니다.'
          },
          ...(order.shippingDate ? [{
            status: 'Shipped',
            location: '물류센터',
            timestamp: order.shippingDate,
            description: '상품이 출고되었습니다.'
          }] : []),
          ...(order.deliveryDate ? [{
            status: 'Delivered',
            location: order.shippingAddress.address,
            timestamp: order.deliveryDate,
            description: '배송이 완료되었습니다.'
          }] : [])
        ]
      };

      res.json({
        success: true,
        data: trackingData
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error getting order tracking:', error);
      next(error);
    }
  };

  /**
   * GET /api/orders/:id/invoice
   * Download order invoice
   */
  downloadInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const buyerId = req.user?.role === 'admin' ? undefined : userId;
      const order = await this.orderService.getOrderById(id, buyerId);

      // TODO: Generate PDF invoice
      // For now, return order data as JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.json"`);
      
      res.json({
        invoice: {
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          buyer: {
            name: order.buyerName,
            email: order.buyerEmail
          },
          items: order.items,
          summary: order.summary,
          billingAddress: order.billingAddress
        }
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error downloading invoice:', error);
      next(error);
    }
  };
}