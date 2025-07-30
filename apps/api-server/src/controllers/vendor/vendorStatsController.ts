import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Order, OrderStatus } from '../../entities/Order';
import { Product, ProductStatus } from '../../entities/Product';
import { Between, MoreThan } from 'typeorm';

// Ensure proper typing for req.user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export class VendorStatsController {
  // 벤더 대시보드 통계
  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const orderRepository = AppDataSource.getRepository(Order);
      const productRepository = AppDataSource.getRepository(Product);

      // 오늘 매출
      const todaySalesResult = await orderRepository
        .createQueryBuilder('order')
        .where('order.vendorId = :vendorId', { vendorId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt BETWEEN :today AND :tomorrow', { today, tomorrow })
        .select('SUM(order.totalAmount)', 'total')
        .getRawOne();

      const todaySales = todaySalesResult?.total || 0;

      // 전체 주문 수
      const totalOrders = await orderRepository.count({
        where: { vendorId, status: OrderStatus.DELIVERED }
      });

      // 신규 주문 (pending)
      const newOrders = await orderRepository.count({
        where: { vendorId, status: OrderStatus.PENDING }
      });

      // 활성 상품 수
      const activeProducts = await productRepository.count({
        where: { vendorId, status: ProductStatus.ACTIVE }
      });

      // 이번 달 매출
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthSalesResult = await orderRepository
        .createQueryBuilder('order')
        .where('order.vendorId = :vendorId', { vendorId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt >= :firstDay', { firstDay: firstDayOfMonth })
        .select('SUM(order.totalAmount)', 'total')
        .getRawOne();

      const monthSales = monthSalesResult?.total || 0;

      // 전월 대비 성장률
      const lastMonth = new Date(firstDayOfMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthEnd = new Date(firstDayOfMonth);
      lastMonthEnd.setDate(0);

      const lastMonthSalesResult = await orderRepository
        .createQueryBuilder('order')
        .where('order.vendorId = :vendorId', { vendorId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt BETWEEN :start AND :end', { 
          start: lastMonth, 
          end: lastMonthEnd 
        })
        .select('SUM(order.totalAmount)', 'total')
        .getRawOne();

      const lastMonthSales = lastMonthSalesResult?.total || 0;
      const growthRate = lastMonthSales > 0 
        ? ((monthSales - lastMonthSales) / lastMonthSales * 100).toFixed(1)
        : 0;

      res.json({
        todaySales,
        totalOrders,
        newOrders,
        activeProducts,
        monthSales,
        growthRate: parseFloat(String(growthRate))
      });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      res.status(500).json({ error: 'Failed to fetch vendor statistics' });
    }
  }

  // 매출 차트 데이터
  async getSalesChartData(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { period = '7d' } = req.query;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const endDate = new Date();
      const startDate = new Date();

      // 기간 설정
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // 일별 매출 데이터 조회
      const salesData = await orderRepository
        .createQueryBuilder('order')
        .where('order.vendorId = :vendorId', { vendorId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt BETWEEN :start AND :end', { 
          start: startDate, 
          end: endDate 
        })
        .select("DATE(order.createdAt)", "date")
        .addSelect("SUM(order.totalAmount)", "sales")
        .addSelect("COUNT(order.id)", "orders")
        .groupBy("DATE(order.createdAt)")
        .orderBy("date", "ASC")
        .getRawMany();

      // 날짜별로 데이터 정리
      const chartData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayData = salesData.find(d => d.date === dateStr);
        
        chartData.push({
          date: dateStr,
          sales: dayData ? parseFloat(dayData.sales) : 0,
          orders: dayData ? parseInt(dayData.orders) : 0
        });
        
        current.setDate(current.getDate() + 1);
      }

      res.json(chartData);
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
      res.status(500).json({ error: 'Failed to fetch sales data' });
    }
  }

  // 최근 주문 목록
  async getRecentOrders(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { limit = '5' } = req.query;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      const recentOrders = await orderRepository.find({
        where: { vendorId },
        order: { createdAt: 'DESC' },
        take: parseInt(limit as string),
        relations: ['user', 'items', 'items.product']
      });

      const formattedOrders = recentOrders.map(order => ({
        id: order.id,
        orderNumber: `#${order.id.slice(-8).toUpperCase()}`,
        customer: order.user.name,
        total: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price
        }))
      }));

      res.json(formattedOrders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
  }

  // 인기 상품 통계
  async getTopProducts(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderRepository = AppDataSource.getRepository(Order);
      
      // 판매량 기준 상위 5개 상품
      const topProducts = await orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.items', 'item')
        .innerJoin('item.product', 'product')
        .where('order.vendorId = :vendorId', { vendorId })
        .andWhere('order.status = :status', { status: 'completed' })
        .select('product.id', 'productId')
        .addSelect('product.name', 'productName')
        .addSelect('SUM(item.quantity)', 'totalQuantity')
        .addSelect('SUM(item.price * item.quantity)', 'totalRevenue')
        .groupBy('product.id')
        .addGroupBy('product.name')
        .orderBy('totalQuantity', 'DESC')
        .limit(5)
        .getRawMany();

      res.json(topProducts.map(p => ({
        id: p.productId,
        name: p.productName,
        quantity: parseInt(p.totalQuantity),
        revenue: parseFloat(p.totalRevenue)
      })));
    } catch (error) {
      console.error('Error fetching top products:', error);
      res.status(500).json({ error: 'Failed to fetch top products' });
    }
  }
}