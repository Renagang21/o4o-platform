import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Order } from '../../entities/Order';
import { OrderStatus } from '../../entities/Order';
import { Between, Like } from 'typeorm';
import { AuthRequest } from '../../types/auth';

export class VendorOrderController {
  // 벤더의 주문 목록 조회
  async getOrders(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { 
        page = '1', 
        limit = '20', 
        status = '', 
        search = '',
        startDate = '',
        endDate = ''
      } = req.query;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const queryBuilder = orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where('order.vendorId = :vendorId', { vendorId });

      // 상태 필터
      if (status && status !== 'all') {
        queryBuilder.andWhere('order.status = :status', { status });
      }

      // 검색 (주문번호, 고객명)
      if (search) {
        queryBuilder.andWhere(
          '(order.id LIKE :search OR customer.name LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // 날짜 필터
      if (startDate && endDate) {
        queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        });
      }

      // 페이지네이션
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy('order.createdAt', 'DESC')
        .skip(skip)
        .take(limitNum);

      const [orders, total] = await queryBuilder.getManyAndCount();

      const formattedOrders = orders.map((order: any) => ({
        id: order.id,
        orderNumber: `#${order.id.slice(-8).toUpperCase()}`,
        customer: {
          name: order.user.name,
          email: order.user.email
        },
        items: order.items.map((item: any) => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));

      res.json({
        orders: formattedOrders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  // 주문 상세 조회
  async getOrder(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { id } = req.params;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id, vendorId },
        relations: ['user', 'items', 'items.product']
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({
        id: order.id,
        orderNumber: `#${order.id.slice(-8).toUpperCase()}`,
        customer: {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          phone: null // TODO: Add phone to User entity
        },
        items: order.items.map((item: any) => ({
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        })),
        subtotal: order.subtotal,
        shippingAmount: order.shippingFee,
        taxAmount: order.taxAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
        shipping: {
          carrier: null,
          trackingNumber: null,
          shippedAt: null,
          deliveredAt: null
        },
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }

  // 주문 상태 업데이트
  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { id } = req.params;
      const { status, trackingNumber, carrier } = req.body;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const order = await orderRepository.findOne({
        where: { id, vendorId },
        relations: ['shipping']
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // 상태 변경 유효성 검사
      const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.READY_TO_SHIP, OrderStatus.CANCELLED],
        [OrderStatus.READY_TO_SHIP]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
        [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
        [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.REFUNDED]: []
      };

      if (status && !allowedTransitions[order.status]?.includes(status)) {
        return res.status(400).json({ 
          error: `Cannot change status from ${order.status} to ${status}` 
        });
      }

      // 상태 업데이트
      if (status) {
        order.status = status;

        // TODO: Implement shipping tracking once shipping entity is added
        // For now, we'll just update the status
      }

      const updatedOrder = await orderRepository.save(order);

      // TODO: 고객에게 알림 전송

      res.json({
        message: 'Order status updated successfully',
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          shipping: null // TODO: Add shipping tracking
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }

  // 주문 통계
  async getOrderStats(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);

      // 상태별 주문 수
      const statusCounts = await orderRepository
        .createQueryBuilder('order')
        .where('order.vendorId = :vendorId', { vendorId })
        .select('order.status', 'status')
        .addSelect('COUNT(order.id)', 'count')
        .groupBy('order.status')
        .getRawMany();

      const stats = {
        total: 0,
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0
      };

      statusCounts.forEach((item: any) => {
        stats[item.status as keyof typeof stats] = parseInt(item.count);
        stats.total += parseInt(item.count);
      });

      res.json(stats);
    } catch (error) {
      console.error('Error fetching order stats:', error);
      res.status(500).json({ error: 'Failed to fetch order statistics' });
    }
  }

  // 대량 주문 상태 업데이트
  async bulkUpdateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { orderIds, status } = req.body;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Invalid order IDs' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      
      // 벤더 소유 주문만 업데이트
      const result = await orderRepository
        .createQueryBuilder()
        .update(Order)
        .set({ status })
        .where('id IN (:...orderIds)', { orderIds })
        .andWhere('vendorId = :vendorId', { vendorId })
        .execute();

      res.json({
        message: 'Orders updated successfully',
        updatedCount: result.affected
      });
    } catch (error) {
      console.error('Error bulk updating orders:', error);
      res.status(500).json({ error: 'Failed to update orders' });
    }
  }
}