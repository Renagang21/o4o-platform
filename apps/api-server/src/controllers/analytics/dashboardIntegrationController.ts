import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { DashboardAnalyticsIntegrationService, DashboardConfig } from '../../services/dashboard-analytics-integration.service';
import { asyncHandler, createForbiddenError, createValidationError } from '../../middleware/errorHandler.middleware';
import logger from '../../utils/logger';

export class DashboardIntegrationController {
  private integrationService: DashboardAnalyticsIntegrationService;

  constructor() {
    this.integrationService = new DashboardAnalyticsIntegrationService();
  }

  // GET /api/dashboard/enhanced - 통합 대시보드 데이터
  getEnhancedDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user;
    const {
      widgets = 'kpi-overview,sales-trends,inventory-status,alerts',
      layout
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Dashboard access required');
    }

    try {
      const widgetList = typeof widgets === 'string' 
        ? widgets.split(',').map(w => w.trim()) 
        : ['kpi-overview'];

      const config: DashboardConfig = {
        userId: currentUser.id,
        role: currentUser.role as 'admin' | 'manager' | 'vendor' | 'supplier',
        widgets: widgetList,
        layout: layout ? JSON.parse(layout as string) : []
      };

      const dashboard = await this.integrationService.getEnhancedDashboard(config);

      logger.info('Enhanced dashboard retrieved successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        widgetCount: dashboard.widgets.length,
        recommendationCount: dashboard.recommendations.length,
      });

      res.json({
        success: true,
        data: dashboard,
        message: 'Enhanced dashboard retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving enhanced dashboard:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/dashboard/widgets/refresh - 위젯 새로고침
  refreshWidgets = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user;
    const { widgetIds } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Dashboard access required');
    }

    // Validate widget IDs
    if (!Array.isArray(widgetIds) || widgetIds.length === 0) {
      throw createValidationError('Widget IDs array is required');
    }

    const validWidgetIds = [
      'kpi-overview', 'sales-trends', 'inventory-status', 'vendor-rankings',
      'revenue-forecast', 'commission-summary', 'top-products', 'alerts',
      'performance-metrics'
    ];

    const invalidIds = widgetIds.filter(id => !validWidgetIds.includes(id));
    if (invalidIds.length > 0) {
      throw createValidationError(`Invalid widget IDs: ${invalidIds.join(', ')}`);
    }

    try {
      const config: DashboardConfig = {
        userId: currentUser.id,
        role: currentUser.role as 'admin' | 'manager' | 'vendor' | 'supplier',
        widgets: widgetIds,
        layout: []
      };

      const refreshedWidgets = await this.integrationService.refreshWidgets(widgetIds, config);

      logger.info('Widgets refreshed successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        widgetIds,
        refreshedCount: refreshedWidgets.length,
      });

      res.json({
        success: true,
        data: {
          widgets: refreshedWidgets,
          refreshedAt: new Date().toISOString()
        },
        message: 'Widgets refreshed successfully',
      });
    } catch (error) {
      logger.error('Error refreshing widgets:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        widgetIds,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/dashboard/config - 대시보드 설정 조회
  getDashboardConfig = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Dashboard access required');
    }

    try {
      // Default widget configurations by role
      const defaultWidgets = {
        admin: [
          'kpi-overview',
          'sales-trends', 
          'inventory-status',
          'vendor-rankings',
          'commission-summary',
          'alerts',
          'performance-metrics'
        ],
        manager: [
          'kpi-overview',
          'sales-trends',
          'inventory-status',
          'vendor-rankings',
          'alerts'
        ],
        vendor: [
          'kpi-overview',
          'sales-trends',
          'inventory-status',
          'commission-summary',
          'top-products'
        ],
        supplier: [
          'kpi-overview',
          'inventory-status',
          'top-products',
          'alerts'
        ]
      };

      const config = {
        availableWidgets: [
          { id: 'kpi-overview', name: 'KPI Overview', type: 'kpi', roles: ['admin', 'manager', 'vendor', 'supplier'] },
          { id: 'sales-trends', name: 'Sales Trends', type: 'chart', roles: ['admin', 'manager', 'vendor'] },
          { id: 'inventory-status', name: 'Inventory Status', type: 'metric', roles: ['admin', 'manager', 'supplier'] },
          { id: 'vendor-rankings', name: 'Vendor Rankings', type: 'table', roles: ['admin', 'manager'] },
          { id: 'revenue-forecast', name: 'Revenue Forecast', type: 'chart', roles: ['admin', 'manager', 'vendor'] },
          { id: 'commission-summary', name: 'Commission Summary', type: 'metric', roles: ['admin', 'manager', 'vendor'] },
          { id: 'top-products', name: 'Top Products', type: 'table', roles: ['admin', 'manager', 'vendor', 'supplier'] },
          { id: 'alerts', name: 'System Alerts', type: 'alert', roles: ['admin', 'manager', 'supplier'] },
          { id: 'performance-metrics', name: 'Performance Metrics', type: 'metric', roles: ['admin'] }
        ].filter(widget => widget.roles.includes(currentUser.role)),
        
        defaultLayout: defaultWidgets[currentUser.role as keyof typeof defaultWidgets] || [],
        
        refreshIntervals: {
          'kpi-overview': 300,      // 5 minutes
          'sales-trends': 300,      // 5 minutes
          'inventory-status': 180,  // 3 minutes
          'vendor-rankings': 600,   // 10 minutes
          'revenue-forecast': 3600, // 1 hour
          'commission-summary': 300, // 5 minutes
          'top-products': 600,      // 10 minutes
          'alerts': 60,             // 1 minute
          'performance-metrics': 30  // 30 seconds
        }
      };

      res.json({
        success: true,
        data: config,
        message: 'Dashboard configuration retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting dashboard config:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });
}