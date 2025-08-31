import { AppDataSource } from '../database/connection';
import { Between, MoreThan, LessThan, In } from 'typeorm';
import { Inventory } from '../entities/inventory/Inventory';
import { StockMovement } from '../entities/inventory/StockMovement';
import { InventoryAlert } from '../entities/inventory/InventoryAlert';
import { ReorderRule } from '../entities/inventory/ReorderRule';
import { VendorInfo } from '../entities/VendorInfo';
import { Supplier } from '../entities/Supplier';
import { SupplierProduct } from '../entities/SupplierProduct';
import { VendorCommission } from '../entities/VendorCommission';
import { CommissionSettlement } from '../entities/CommissionSettlement';
import { Order } from '../entities/Order';
import { cacheService } from './cache.service';
import { analyticsCacheService } from './analytics-cache.service';
import logger from '../utils/logger';
import moment from 'moment';

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  vendorIds?: string[];
  supplierIds?: string[];
  productIds?: string[];
  categories?: string[];
  warehouseIds?: string[];
}

export interface KPIMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  inventoryTurnover: number;
  stockoutRate: number;
  fulfillmentRate: number;
  returnRate: number;
  grossMargin: number;
  netProfit: number;
}

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface ProductPerformance {
  productId: string;
  sku: string;
  name: string;
  category: string;
  totalSales: number;
  revenue: number;
  margin: number;
  turnoverRate: number;
  stockLevel: number;
  alertLevel: string;
  lastSaleDate: Date;
  daysInStock: number;
}

export interface VendorRanking {
  vendorId: string;
  vendorName: string;
  totalCommission: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  rating: number;
  rank: number;
  change: number; // Position change from last period
}

export class AnalyticsService {
  private inventoryRepository = AppDataSource.getRepository(Inventory);
  private stockMovementRepository = AppDataSource.getRepository(StockMovement);
  private inventoryAlertRepository = AppDataSource.getRepository(InventoryAlert);
  private reorderRuleRepository = AppDataSource.getRepository(ReorderRule);
  private vendorRepository = AppDataSource.getRepository(VendorInfo);
  private supplierRepository = AppDataSource.getRepository(Supplier);
  private supplierProductRepository = AppDataSource.getRepository(SupplierProduct);
  private vendorCommissionRepository = AppDataSource.getRepository(VendorCommission);
  private settlementRepository = AppDataSource.getRepository(CommissionSettlement);
  private orderRepository = AppDataSource.getRepository(Order);

  // Main dashboard analytics
  async getDashboardAnalytics(filters: AnalyticsFilter = {}) {
    const cacheKey = `dashboard_analytics:${this.hashFilters(filters)}`;
    const cached = await analyticsCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const {
      startDate = moment().subtract(30, 'days').toDate(),
      endDate = new Date(),
    } = filters;

    try {
      const [
        kpiMetrics,
        salesTrends,
        inventoryOverview,
        topProducts,
        vendorRankings,
        alertSummary,
        revenueBreakdown,
      ] = await Promise.all([
        this.calculateKPIMetrics(filters),
        this.getSalesTrends(startDate, endDate),
        this.getInventoryOverview(filters),
        this.getTopPerformingProducts(filters, 10),
        this.getVendorRankings(filters, 10),
        this.getAlertSummary(),
        this.getRevenueBreakdown(filters),
      ]);

      const analytics = {
        timestamp: new Date().toISOString(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        kpi: kpiMetrics,
        trends: {
          sales: salesTrends,
          inventory: await this.getInventoryTrends(startDate, endDate),
          commission: await this.getCommissionTrends(startDate, endDate),
        },
        overview: {
          inventory: inventoryOverview,
          revenue: revenueBreakdown,
          alerts: alertSummary,
        },
        topPerformers: {
          products: topProducts,
          vendors: vendorRankings,
        },
        insights: await this.generateInsights(kpiMetrics, salesTrends),
      };

      // Cache for 10 minutes with enhanced caching
      await analyticsCacheService.set(cacheKey, analytics, { 
        ttl: 600, 
        tags: ['analytics', 'dashboard', 'kpi', 'inventory', 'sales'], 
        priority: 'high' 
      });
      
      return analytics;
    } catch (error) {
      logger.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  // Inventory overview analytics
  async getInventoryOverview(filters: AnalyticsFilter = {}) {
    const cacheKey = `inventory_overview:${this.hashFilters(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Basic inventory stats
      const totalProducts = await this.inventoryRepository.count({
        where: filters.productIds ? { id: In(filters.productIds) } : {},
      });

      const activeProducts = await this.inventoryRepository.count({
        where: {
          status: 'active',
          ...(filters.productIds ? { id: In(filters.productIds) } : {}),
        },
      });

      const lowStockProducts = await this.inventoryRepository.count({
        where: {
          status: 'active',
          ...(filters.productIds ? { id: In(filters.productIds) } : {}),
        },
      });

      const outOfStockProducts = await this.inventoryRepository.count({
        where: {
          quantity: 0,
          status: 'active',
          ...(filters.productIds ? { id: In(filters.productIds) } : {}),
        },
      });

      // Stock value calculation
      const stockValueResult = await this.inventoryRepository
        .createQueryBuilder('inventory')
        .select('SUM(inventory.quantity * inventory.averageCost)', 'totalValue')
        .where('inventory.status = :status', { status: 'active' })
        .andWhere(filters.productIds ? 'inventory.id IN (:...productIds)' : '1=1', { productIds: filters.productIds })
        .getRawOne();

      // Turnover analysis
      const turnoverStats = await this.calculateInventoryTurnover(filters);

      // Category breakdown
      const categoryBreakdown = await this.inventoryRepository
        .createQueryBuilder('inventory')
        .select('inventory.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(inventory.quantity)', 'totalQuantity')
        .addSelect('SUM(inventory.quantity * inventory.averageCost)', 'totalValue')
        .where('inventory.status = :status', { status: 'active' })
        .andWhere(filters.productIds ? 'inventory.id IN (:...productIds)' : '1=1', { productIds: filters.productIds })
        .groupBy('inventory.category')
        .orderBy('totalValue', 'DESC')
        .getRawMany();

      // Stock alerts by severity
      const alertsByLevel = await this.inventoryAlertRepository
        .createQueryBuilder('alert')
        .select('alert.alertLevel', 'level')
        .addSelect('COUNT(*)', 'count')
        .where('alert.status = :status', { status: 'active' })
        .groupBy('alert.alertLevel')
        .getRawMany();

      const overview = {
        summary: {
          totalProducts,
          activeProducts,
          lowStockProducts,
          outOfStockProducts,
          stockValue: parseFloat(stockValueResult?.totalValue || '0'),
          averageTurnover: turnoverStats.averageTurnover,
        },
        stockHealth: {
          healthyStock: activeProducts - lowStockProducts - outOfStockProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
          healthPercentage: ((activeProducts - lowStockProducts - outOfStockProducts) / activeProducts) * 100,
        },
        turnover: turnoverStats,
        categoryBreakdown: categoryBreakdown.map(cat => ({
          category: cat.category || 'Uncategorized',
          productCount: parseInt(cat.count),
          totalQuantity: parseInt(cat.totalQuantity || '0'),
          totalValue: parseFloat(cat.totalValue || '0'),
        })),
        alerts: {
          total: alertsByLevel.reduce((sum, alert) => sum + parseInt(alert.count), 0),
          byLevel: alertsByLevel.reduce((acc, alert) => {
            acc[alert.level] = parseInt(alert.count);
            return acc;
          }, {} as Record<string, number>),
        },
        trends: await this.getInventoryTrends(
          moment().subtract(30, 'days').toDate(),
          new Date()
        ),
      };

      // Cache for 15 minutes
      await cacheService.set(cacheKey, overview, { ttl: 900, tags: ['analytics', 'inventory'] });

      return overview;
    } catch (error) {
      logger.error('Error getting inventory overview:', error);
      throw error;
    }
  }

  // Sales trends analysis
  async getSalesTrends(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const cacheKey = `sales_trends:${startDate.toISOString()}:${endDate.toISOString()}:${groupBy}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let dateFormat: string;
      let dateGroup: string;
      
      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-WW';
          dateGroup = "DATE_TRUNC('week', orders.\"createdAt\")";
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateGroup = "DATE_TRUNC('month', orders.\"createdAt\")";
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateGroup = "DATE_TRUNC('day', orders.\"createdAt\")";
      }

      const salesData = await this.orderRepository
        .createQueryBuilder('orders')
        .select(`${dateGroup} as period`)
        .addSelect('COUNT(*)', 'orderCount')
        .addSelect('SUM(orders.totalAmount)', 'totalRevenue')
        .addSelect('AVG(orders.totalAmount)', 'averageOrderValue')
        .where('orders.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('orders.status = :status', { status: 'completed' })
        .groupBy('period')
        .orderBy('period', 'ASC')
        .getRawMany();

      const trends = salesData.map((data, index) => ({
        period: moment(data.period).format(dateFormat),
        orderCount: parseInt(data.orderCount),
        totalRevenue: parseFloat(data.totalRevenue || '0'),
        averageOrderValue: parseFloat(data.averageOrderValue || '0'),
        change: index > 0 ? parseFloat(data.totalRevenue || '0') - parseFloat(salesData[index - 1].totalRevenue || '0') : 0,
        changePercent: index > 0 && parseFloat(salesData[index - 1].totalRevenue || '0') > 0
          ? ((parseFloat(data.totalRevenue || '0') - parseFloat(salesData[index - 1].totalRevenue || '0')) / parseFloat(salesData[index - 1].totalRevenue || '0')) * 100
          : 0,
      }));

      // Cache for 30 minutes
      await cacheService.set(cacheKey, trends, { ttl: 1800, tags: ['analytics', 'sales'] });

      return trends;
    } catch (error) {
      logger.error('Error getting sales trends:', error);
      throw error;
    }
  }

  // Product performance analysis
  async getProductPerformance(filters: AnalyticsFilter = {}, limit = 50): Promise<ProductPerformance[]> {
    const cacheKey = `product_performance:${this.hashFilters(filters)}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const {
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
      } = filters;

      // Get product performance data
      const performance = await this.inventoryRepository
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.stockMovements', 'movements', 
          'movements.createdAt BETWEEN :startDate AND :endDate AND movements.movementType = :movementType',
          { startDate, endDate, movementType: 'sale' }
        )
        .leftJoinAndSelect('inventory.alerts', 'alerts', 'alerts.status = :alertStatus', { alertStatus: 'active' })
        .select([
          'inventory.id as productId',
          'inventory.sku as sku',
          'inventory.productName as name',
          'inventory.category as category',
          'inventory.quantity as stockLevel',
          'inventory.createdAt as createdAt',
        ])
        .addSelect('COALESCE(SUM(movements.quantity), 0)', 'totalSales')
        .addSelect('COALESCE(SUM(movements.totalValue), 0)', 'revenue')
        .addSelect('COALESCE(SUM(movements.totalValue - movements.quantity * movements.unitCost), 0)', 'margin')
        .addSelect('MAX(movements.createdAt)', 'lastSaleDate')
        .addSelect('MIN(alerts.alertLevel)', 'alertLevel')
        .where('inventory.status = :status', { status: 'active' })
        .andWhere(filters.productIds ? 'inventory.id IN (:...productIds)' : '1=1', { productIds: filters.productIds })
        .andWhere(filters.categories ? 'inventory.category IN (:...categories)' : '1=1', { categories: filters.categories })
        .groupBy('inventory.id, inventory.sku, inventory.productName, inventory.category, inventory.quantity, inventory.createdAt')
        .orderBy('totalSales', 'DESC')
        .limit(limit)
        .getRawMany();

      const products: ProductPerformance[] = performance.map(p => {
        const daysInStock = moment().diff(moment(p.createdAt), 'days');
        const turnoverRate = daysInStock > 0 ? (parseFloat(p.totalSales) / daysInStock) * 30 : 0; // Monthly turnover

        return {
          productId: p.productId,
          sku: p.sku,
          name: p.name,
          category: p.category || 'Uncategorized',
          totalSales: parseInt(p.totalSales),
          revenue: parseFloat(p.revenue),
          margin: parseFloat(p.margin),
          turnoverRate,
          stockLevel: parseInt(p.stockLevel),
          alertLevel: p.alertLevel || 'none',
          lastSaleDate: p.lastSaleDate || null,
          daysInStock,
        };
      });

      // Cache for 20 minutes
      await cacheService.set(cacheKey, products, { ttl: 1200, tags: ['analytics', 'products'] });

      return products;
    } catch (error) {
      logger.error('Error getting product performance:', error);
      throw error;
    }
  }

  // Vendor rankings
  async getVendorRankings(filters: AnalyticsFilter = {}, limit = 20): Promise<VendorRanking[]> {
    const cacheKey = `vendor_rankings:${this.hashFilters(filters)}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const {
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
      } = filters;

      // Get current period rankings
      const currentRankings = await this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoin('vendor.commissions', 'commissions', 
          'commissions.createdAt BETWEEN :startDate AND :endDate',
          { startDate, endDate }
        )
        .leftJoin('orders', 'orders', 'orders.vendorId = vendor.id AND orders.createdAt BETWEEN :startDate AND :endDate')
        .select([
          'vendor.id as vendorId',
          'vendor.vendorName as vendorName',
          'vendor.rating as rating',
        ])
        .addSelect('COALESCE(SUM(commissions.totalCommission), 0)', 'totalCommission')
        .addSelect('COALESCE(COUNT(orders.id), 0)', 'totalOrders')
        .addSelect('COALESCE(SUM(orders.totalAmount), 0)', 'totalRevenue')
        .addSelect('COALESCE(AVG(orders.totalAmount), 0)', 'averageOrderValue')
        .where('vendor.status = :status', { status: 'active' })
        .andWhere(filters.vendorIds ? 'vendor.id IN (:...vendorIds)' : '1=1', { vendorIds: filters.vendorIds })
        .groupBy('vendor.id, vendor.vendorName, vendor.rating')
        .orderBy('totalCommission', 'DESC')
        .limit(limit)
        .getRawMany();

      // Get previous period for comparison
      const previousStart = moment(startDate).subtract(moment(endDate).diff(startDate), 'milliseconds').toDate();
      const previousEnd = startDate;

      const previousRankings = await this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoin('vendor.commissions', 'commissions', 
          'commissions.createdAt BETWEEN :startDate AND :endDate',
          { startDate: previousStart, endDate: previousEnd }
        )
        .select([
          'vendor.id as vendorId',
        ])
        .addSelect('COALESCE(SUM(commissions.totalCommission), 0)', 'totalCommission')
        .where('vendor.status = :status', { status: 'active' })
        .groupBy('vendor.id')
        .orderBy('totalCommission', 'DESC')
        .getRawMany();

      // Create previous ranking map
      const previousRankMap = previousRankings.reduce((map, vendor, index) => {
        map[vendor.vendorId] = index + 1;
        return map;
      }, {} as Record<string, number>);

      const rankings: VendorRanking[] = currentRankings.map((vendor, index) => {
        const currentRank = index + 1;
        const previousRank = previousRankMap[vendor.vendorId] || currentRank;
        const change = previousRank - currentRank; // Positive = moved up, Negative = moved down

        return {
          vendorId: vendor.vendorId,
          vendorName: vendor.vendorName,
          totalCommission: parseFloat(vendor.totalCommission),
          totalOrders: parseInt(vendor.totalOrders),
          totalRevenue: parseFloat(vendor.totalRevenue),
          averageOrderValue: parseFloat(vendor.averageOrderValue),
          conversionRate: 0, // Would need additional data to calculate
          rating: parseFloat(vendor.rating || '0'),
          rank: currentRank,
          change,
        };
      });

      // Cache for 15 minutes
      await cacheService.set(cacheKey, rankings, { ttl: 900, tags: ['analytics', 'vendors'] });

      return rankings;
    } catch (error) {
      logger.error('Error getting vendor rankings:', error);
      throw error;
    }
  }

  // Real-time metrics
  async getRealTimeMetrics() {
    const cacheKey = 'realtime_metrics';
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const now = new Date();
      const hourAgo = moment().subtract(1, 'hour').toDate();
      const dayAgo = moment().subtract(1, 'day').toDate();

      const [
        recentOrders,
        recentAlerts,
        activeUsers,
        systemHealth,
      ] = await Promise.all([
        this.orderRepository.count({
          where: { createdAt: MoreThan(hourAgo) },
        }),
        
        this.inventoryAlertRepository.count({
          where: { 
            createdAt: MoreThan(dayAgo),
            status: 'active',
          },
        }),
        
        // Mock active users count - would need session tracking
        Promise.resolve(Math.floor(Math.random() * 50) + 10),
        
        this.getSystemHealthMetrics(),
      ]);

      const metrics = {
        timestamp: now.toISOString(),
        orders: {
          lastHour: recentOrders,
          trend: await this.getHourlyOrderTrend(),
        },
        alerts: {
          active: recentAlerts,
          new: await this.inventoryAlertRepository.count({
            where: { createdAt: MoreThan(hourAgo), status: 'active' },
          }),
        },
        users: {
          active: activeUsers,
          peak: Math.floor(activeUsers * 1.5), // Mock peak
        },
        system: systemHealth,
      };

      // Cache for 1 minute (real-time data)
      await cacheService.set(cacheKey, metrics, { ttl: 60, tags: ['analytics', 'realtime'] });

      return metrics;
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  // Helper methods
  private async calculateKPIMetrics(filters: AnalyticsFilter): Promise<KPIMetrics> {
    const {
      startDate = moment().subtract(30, 'days').toDate(),
      endDate = new Date(),
    } = filters;

    // Mock implementation - would calculate real KPIs
    return {
      totalRevenue: 1250000,
      totalOrders: 3450,
      averageOrderValue: 362.32,
      conversionRate: 3.2,
      inventoryTurnover: 8.5,
      stockoutRate: 2.1,
      fulfillmentRate: 98.7,
      returnRate: 1.8,
      grossMargin: 32.5,
      netProfit: 187500,
    };
  }

  private async calculateInventoryTurnover(filters: AnalyticsFilter) {
    // Calculate inventory turnover rate
    const totalSales = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .select('SUM(movement.quantity)', 'totalSold')
      .where('movement.movementType = :type', { type: 'sale' })
      .andWhere('movement.createdAt >= :startDate', { 
        startDate: moment().subtract(365, 'days').toDate() 
      })
      .getRawOne();

    const averageInventory = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select('AVG(inventory.quantity)', 'avgQuantity')
      .where('inventory.status = :status', { status: 'active' })
      .getRawOne();

    const turnoverRate = parseFloat(averageInventory?.avgQuantity || '1') > 0
      ? parseFloat(totalSales?.totalSold || '0') / parseFloat(averageInventory.avgQuantity)
      : 0;

    return {
      averageTurnover: turnoverRate,
      totalSold: parseInt(totalSales?.totalSold || '0'),
      averageInventory: parseFloat(averageInventory?.avgQuantity || '0'),
    };
  }

  private async getInventoryTrends(startDate: Date, endDate: Date) {
    // Get inventory level trends over time
    return [
      { period: '2024-01', totalValue: 2500000, itemCount: 15000 },
      { period: '2024-02', totalValue: 2650000, itemCount: 15500 },
      { period: '2024-03', totalValue: 2800000, itemCount: 16000 },
    ];
  }

  private async getCommissionTrends(startDate: Date, endDate: Date) {
    // Get commission trends over time
    const trends = await this.vendorCommissionRepository
      .createQueryBuilder('commission')
      .select("DATE_TRUNC('month', commission.createdAt) as period")
      .addSelect('SUM(commission.totalCommission)', 'totalCommission')
      .addSelect('COUNT(*)', 'commissionCount')
      .where('commission.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return trends.map(trend => ({
      period: moment(trend.period).format('YYYY-MM'),
      totalCommission: parseFloat(trend.totalCommission || '0'),
      commissionCount: parseInt(trend.commissionCount),
    }));
  }

  private async getTopPerformingProducts(filters: AnalyticsFilter, limit: number) {
    return this.getProductPerformance(filters, limit);
  }

  private async getAlertSummary() {
    const activeAlerts = await this.inventoryAlertRepository
      .createQueryBuilder('alert')
      .select('alert.alertLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('alert.status = :status', { status: 'active' })
      .groupBy('alert.alertLevel')
      .getRawMany();

    return {
      total: activeAlerts.reduce((sum, alert) => sum + parseInt(alert.count), 0),
      byLevel: activeAlerts.reduce((acc, alert) => {
        acc[alert.level] = parseInt(alert.count);
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async getRevenueBreakdown(filters: AnalyticsFilter) {
    // Mock revenue breakdown by category/channel
    return {
      byCategory: [
        { category: 'Electronics', revenue: 450000, percentage: 36 },
        { category: 'Fashion', revenue: 320000, percentage: 25.6 },
        { category: 'Home & Garden', revenue: 280000, percentage: 22.4 },
        { category: 'Sports', revenue: 200000, percentage: 16 },
      ],
      byChannel: [
        { channel: 'Online', revenue: 875000, percentage: 70 },
        { channel: 'Retail', revenue: 250000, percentage: 20 },
        { channel: 'B2B', revenue: 125000, percentage: 10 },
      ],
    };
  }

  private async generateInsights(kpi: KPIMetrics, trends: any[]) {
    const insights = [];

    // Inventory insights
    if (kpi.stockoutRate > 3) {
      insights.push({
        type: 'warning',
        title: 'High Stockout Rate',
        message: `Stockout rate is ${kpi.stockoutRate}%, above the 3% threshold`,
        recommendation: 'Review reorder points and safety stock levels',
        priority: 'high',
      });
    }

    // Sales insights
    if (trends.length > 1) {
      const lastTrend = trends[trends.length - 1];
      const prevTrend = trends[trends.length - 2];
      
      if (lastTrend.changePercent < -10) {
        insights.push({
          type: 'alert',
          title: 'Sales Decline',
          message: `Sales dropped by ${Math.abs(lastTrend.changePercent).toFixed(1)}% in the last period`,
          recommendation: 'Investigate market conditions and promotional opportunities',
          priority: 'high',
        });
      }
    }

    // Performance insights
    if (kpi.conversionRate < 2) {
      insights.push({
        type: 'info',
        title: 'Conversion Opportunity',
        message: `Conversion rate is ${kpi.conversionRate}%, below industry average`,
        recommendation: 'Optimize product listings and checkout process',
        priority: 'medium',
      });
    }

    return insights;
  }

  private async getHourlyOrderTrend() {
    const hours = [];
    for (let i = 23; i >= 0; i--) {
      const hour = moment().subtract(i, 'hours');
      const orders = await this.orderRepository.count({
        where: {
          createdAt: Between(
            hour.startOf('hour').toDate(),
            hour.endOf('hour').toDate()
          ),
        },
      });
      hours.push({
        hour: hour.format('HH:00'),
        orders,
      });
    }
    return hours;
  }

  private async getSystemHealthMetrics() {
    // Mock system health metrics
    return {
      apiResponseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      databaseConnections: Math.floor(Math.random() * 10) + 5, // 5-15 connections
      cacheHitRate: Math.floor(Math.random() * 20) + 80, // 80-100%
      errorRate: Math.random() * 0.5, // 0-0.5%
    };
  }

  private hashFilters(filters: AnalyticsFilter): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64').slice(0, 16);
  }
}