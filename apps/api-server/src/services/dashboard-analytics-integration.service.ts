// @ts-nocheck
import { AnalyticsService } from './analytics.service';
import { ReportingService } from './reporting.service';
import { ForecastingService } from './forecasting.service';
import { analyticsCacheService } from './analytics-cache.service';
import logger from '../utils/logger';

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'metric' | 'alert' | 'trend';
  title: string;
  data: any;
  refreshInterval?: number; // seconds
  lastUpdated: string;
  error?: string;
}

export interface DashboardConfig {
  userId: string;
  role: 'admin' | 'manager' | 'vendor' | 'supplier';
  widgets: string[]; // widget IDs
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    widgetId: string;
  }[];
}

export class DashboardAnalyticsIntegrationService {
  private analyticsService: AnalyticsService;
  private reportingService: ReportingService;
  private forecastingService: ForecastingService;

  constructor() {
    this.analyticsService = new AnalyticsService();
    this.reportingService = new ReportingService();
    this.forecastingService = new ForecastingService();
  }

  /**
   * Get enhanced dashboard data with analytics integration
   */
  async getEnhancedDashboard(config: DashboardConfig): Promise<{
    widgets: DashboardWidget[];
    summary: any;
    recommendations: string[];
  }> {
    try {
      const { userId, role, widgets: widgetIds } = config;
      
      // Get base filters based on user role
      const filters = await this.getFiltersForRole(userId, role);
      
      // Get all widget data in parallel
      const widgetPromises = widgetIds.map(widgetId => 
        this.getWidgetData(widgetId, filters, role).catch(error => ({
          id: widgetId,
          type: 'metric' as const,
          title: 'Error',
          data: null,
          error: error.message,
          lastUpdated: new Date().toISOString()
        }))
      );
      
      const widgets = await Promise.all(widgetPromises);
      
      // Generate summary and recommendations
      const [summary, recommendations] = await Promise.all([
        this.generateDashboardSummary(widgets, filters, role),
        this.generateRecommendations(widgets, filters, role)
      ]);
      
      return {
        widgets: widgets.filter(widget => widget !== null),
        summary,
        recommendations
      };
    } catch (error) {
      logger.error('Error getting enhanced dashboard:', error);
      throw error;
    }
  }

  /**
   * Get data for a specific widget
   */
  private async getWidgetData(
    widgetId: string, 
    filters: any, 
    role: string
  ): Promise<DashboardWidget | null> {
    const cacheKey = `widget:${widgetId}:${role}:${this.hashFilters(filters)}`;
    const cached = await analyticsCacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    let widget: DashboardWidget | null = null;

    try {
      switch (widgetId) {
        case 'kpi-overview':
          widget = await this.buildKPIOverviewWidget(filters);
          break;
          
        case 'sales-trends':
          widget = await this.buildSalesTrendsWidget(filters);
          break;
          
        case 'inventory-status':
          widget = await this.buildInventoryStatusWidget(filters);
          break;
          
        case 'vendor-rankings':
          widget = await this.buildVendorRankingsWidget(filters);
          break;
          
        case 'revenue-forecast':
          widget = await this.buildRevenueForecastWidget(filters);
          break;
          
        case 'commission-summary':
          widget = await this.buildCommissionSummaryWidget(filters);
          break;
          
        case 'top-products':
          widget = await this.buildTopProductsWidget(filters);
          break;
          
        case 'alerts':
          widget = await this.buildAlertsWidget(filters);
          break;
          
        case 'performance-metrics':
          widget = await this.buildPerformanceMetricsWidget(filters);
          break;
          
        default:
          logger.warn(`Unknown widget ID: ${widgetId}`);
          return null;
      }

      if (widget) {
        // Cache widget data for 5 minutes
        await analyticsCacheService.set(cacheKey, widget, {
          ttl: 300,
          tags: ['dashboard', 'widget', widgetId],
          priority: 'high'
        });
      }

      return widget;
    } catch (error) {
      logger.error(`Error building widget ${widgetId}:`, error);
      return {
        id: widgetId,
        type: 'metric',
        title: 'Error Loading Widget',
        data: null,
        error: error.message,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private async buildKPIOverviewWidget(filters: any): Promise<DashboardWidget> {
    const kpiData = await this.analyticsService.getDashboardAnalytics(filters);
    
    return {
      id: 'kpi-overview',
      type: 'kpi',
      title: 'Key Performance Indicators',
      data: {
        metrics: [
          {
            name: 'Total Revenue',
            value: kpiData.kpi?.totalRevenue || 0,
            change: kpiData.kpi?.revenueGrowth || 0,
            format: 'currency'
          },
          {
            name: 'Total Orders',
            value: kpiData.kpi?.totalOrders || 0,
            change: kpiData.kpi?.orderGrowth || 0,
            format: 'number'
          },
          {
            name: 'Active Vendors',
            value: kpiData.kpi?.activeVendors || 0,
            change: kpiData.kpi?.vendorGrowth || 0,
            format: 'number'
          },
          {
            name: 'Inventory Value',
            value: kpiData.overview?.inventory?.totalValue || 0,
            change: 0,
            format: 'currency'
          }
        ]
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildSalesTrendsWidget(filters: any): Promise<DashboardWidget> {
    const salesData = await this.analyticsService.getSalesTrends(
      filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      filters.endDate || new Date(),
      'day'
    );
    
    return {
      id: 'sales-trends',
      type: 'chart',
      title: 'Sales Trends',
      data: {
        chartType: 'line',
        data: (salesData as any[]).map(item => ({
          date: item.date,
          revenue: item.totalRevenue,
          orders: item.orderCount
        })),
        config: {
          xAxis: 'date',
          yAxis: ['revenue', 'orders'],
          colors: ['#3B82F6', '#10B981']
        }
      },
      refreshInterval: 300, // 5 minutes
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildInventoryStatusWidget(filters: any): Promise<DashboardWidget> {
    const inventoryData = await this.analyticsService.getInventoryOverview(filters);
    
    return {
      id: 'inventory-status',
      type: 'metric',
      title: 'Inventory Status',
      data: {
        summary: {
          totalProducts: (inventoryData as any).totalProducts,
          totalValue: (inventoryData as any).totalValue,
          lowStockItems: (inventoryData as any).lowStockItems,
          outOfStockItems: (inventoryData as any).outOfStockItems
        },
        stockLevels: (inventoryData as any).stockLevels,
        alerts: ((inventoryData as any).alerts || []).slice(0, 5) // Top 5 alerts
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildVendorRankingsWidget(filters: any): Promise<DashboardWidget> {
    const rankings = await this.analyticsService.getVendorRankings(filters, 10);
    
    return {
      id: 'vendor-rankings',
      type: 'table',
      title: 'Top Vendors',
      data: {
        headers: ['Vendor', 'Revenue', 'Orders', 'Commission', 'Rating'],
        rows: rankings.map(vendor => [
          vendor.vendorName,
          vendor.totalRevenue,
          vendor.totalOrders,
          vendor.totalCommission,
          vendor.rating
        ])
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildRevenueForecastWidget(filters: any): Promise<DashboardWidget> {
    const forecast = await this.forecastingService.forecastRevenue({
      periods: 6,
      method: 'exponential',
      filters
    });
    
    return {
      id: 'revenue-forecast',
      type: 'chart',
      title: 'Revenue Forecast (6 Months)',
      data: {
        chartType: 'line',
        data: forecast.forecasts.map(point => ({
          period: point.period,
          forecast: point.value,
          upperBound: point.upperBound,
          lowerBound: point.lowerBound
        })),
        config: {
          xAxis: 'period',
          yAxis: ['forecast'],
          bands: [{ upper: 'upperBound', lower: 'lowerBound' }],
          colors: ['#8B5CF6']
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildCommissionSummaryWidget(filters: any): Promise<DashboardWidget> {
    const commissionStats = await (this.analyticsService as any).getCommissionStatistics();
    
    return {
      id: 'commission-summary',
      type: 'metric',
      title: 'Commission Summary',
      data: {
        pendingCommissions: commissionStats.vendorCommissions?.pending || 0,
        approvedCommissions: commissionStats.vendorCommissions?.approved || 0,
        totalPending: commissionStats.totalPending || 0,
        breakdown: {
          vendors: commissionStats.vendorCommissions,
          suppliers: commissionStats.supplierSettlements
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildTopProductsWidget(filters: any): Promise<DashboardWidget> {
    const products = await this.analyticsService.getProductPerformance(filters, 10);
    
    return {
      id: 'top-products',
      type: 'table',
      title: 'Top Products',
      data: {
        headers: ['Product', 'Revenue', 'Sales', 'Margin', 'Turnover'],
        rows: products.map(product => [
          product.name,
          product.revenue,
          product.totalSales,
          product.margin,
          product.turnoverRate
        ])
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildAlertsWidget(filters: any): Promise<DashboardWidget> {
    const inventoryOverview = await this.analyticsService.getInventoryOverview(filters);
    const alerts = (inventoryOverview as any).alerts || [];
    
    return {
      id: 'alerts',
      type: 'alert',
      title: 'System Alerts',
      data: {
        alerts: alerts.map((alert: any) => ({
          type: alert.type,
          severity: alert.priority,
          message: alert.type === 'low_stock' 
            ? `Low stock: ${alert.productName} (${alert.currentStock} left)`
            : `Out of stock: ${alert.productName}`,
          timestamp: new Date().toISOString()
        }))
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private async buildPerformanceMetricsWidget(filters: any): Promise<DashboardWidget> {
    const realTimeMetrics = await this.analyticsService.getRealTimeMetrics();
    
    return {
      id: 'performance-metrics',
      type: 'metric',
      title: 'Performance Metrics',
      data: {
        metrics: [
          {
            name: 'Response Time',
            value: (realTimeMetrics as any).systemPerformance?.averageResponseTime || 0,
            unit: 'ms',
            status: (realTimeMetrics as any).systemPerformance?.averageResponseTime < 200 ? 'good' : 'warning'
          },
          {
            name: 'Active Sessions',
            value: realTimeMetrics.activeSessions || 0,
            unit: 'sessions'
          },
          {
            name: 'Cache Hit Rate',
            value: realTimeMetrics.systemPerformance?.cacheHitRate || 0,
            unit: '%',
            status: realTimeMetrics.systemPerformance?.cacheHitRate > 80 ? 'good' : 'warning'
          }
        ]
      },
      refreshInterval: 30, // 30 seconds for real-time metrics
      lastUpdated: new Date().toISOString()
    };
  }

  private async getFiltersForRole(userId: string, role: string): Promise<any> {
    const filters: any = {};
    
    try {
      if (role === 'vendor') {
        // Get vendor info for filtering
        const { AppDataSource } = await import('../database/connection');
        const vendorRepository = AppDataSource.getRepository('VendorInfo');
        const vendor = await vendorRepository.findOne({ where: { userId } });
        if (vendor) {
          filters.vendorIds = [vendor.id];
        }
      } else if (role === 'supplier') {
        // Get supplier info for filtering
        const { AppDataSource } = await import('../database/connection');
        const supplierRepository = AppDataSource.getRepository('Supplier');
        const supplier = await supplierRepository.findOne({ where: { contactEmail: userId } });
        if (supplier) {
          filters.supplierIds = [supplier.id];
        }
      }
      
      return filters;
    } catch (error) {
      logger.error('Error getting filters for role:', error);
      return {};
    }
  }

  private async generateDashboardSummary(widgets: DashboardWidget[], filters: any, role: string) {
    return {
      lastUpdated: new Date().toISOString(),
      widgetCount: widgets.length,
      errorCount: widgets.filter(w => w.error).length,
      role,
      period: {
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      }
    };
  }

  private async generateRecommendations(widgets: DashboardWidget[], filters: any, role: string): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      // Analyze widgets for recommendations
      const alertsWidget = widgets.find(w => w.id === 'alerts');
      if (alertsWidget?.data?.alerts?.length > 0) {
        recommendations.push(`You have ${alertsWidget.data.alerts.length} inventory alerts that need attention`);
      }
      
      const kpiWidget = widgets.find(w => w.id === 'kpi-overview');
      if (kpiWidget?.data?.metrics) {
        const revenueMetric = kpiWidget.data.metrics.find((m: any) => m.name === 'Total Revenue');
        if (revenueMetric?.change < 0) {
          recommendations.push('Revenue has declined compared to previous period - consider reviewing pricing strategy');
        }
        
        const orderMetric = kpiWidget.data.metrics.find((m: any) => m.name === 'Total Orders');
        if (orderMetric?.change > 20) {
          recommendations.push('Order volume is increasing significantly - ensure inventory levels can meet demand');
        }
      }
      
      const inventoryWidget = widgets.find(w => w.id === 'inventory-status');
      if (inventoryWidget?.data?.summary?.lowStockItems > 10) {
        recommendations.push('Multiple items are running low on stock - consider bulk reordering to reduce costs');
      }
      
      // Role-specific recommendations
      if (role === 'vendor') {
        recommendations.push('Review your best-performing products to optimize your inventory mix');
      } else if (role === 'admin') {
        recommendations.push('Monitor vendor performance and provide support to underperforming vendors');
      }
      
    } catch (error) {
      logger.error('Error generating recommendations:', error);
    }
    
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private hashFilters(filters: any): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64');
  }

  /**
   * Refresh specific widgets
   */
  async refreshWidgets(widgetIds: string[], config: DashboardConfig): Promise<DashboardWidget[]> {
    const filters = await this.getFiltersForRole(config.userId, config.role);
    
    // Clear cache for these widgets
    const cacheKeys = widgetIds.map(id => `widget:${id}:${config.role}:${this.hashFilters(filters)}`);
    await Promise.all(cacheKeys.map(key => analyticsCacheService.delete(key)));
    
    // Get fresh data
    const widgets = await Promise.all(
      widgetIds.map(widgetId => this.getWidgetData(widgetId, filters, config.role))
    );
    
    return widgets.filter(widget => widget !== null) as DashboardWidget[];
  }
}