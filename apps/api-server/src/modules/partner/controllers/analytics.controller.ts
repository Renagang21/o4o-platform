import { Request, Response, NextFunction } from 'express';
import { AdvancedAnalyticsService } from '../services/analytics.service';
import { PartnerEventService } from '../services/event.service';
import { ApiResponse } from '../dto/response.dto';

export class AnalyticsController {
  private analyticsService: AdvancedAnalyticsService;
  private eventService: PartnerEventService;

  constructor() {
    this.analyticsService = new AdvancedAnalyticsService();
    this.eventService = new PartnerEventService();
  }

  /**
   * GET /api/v1/partner/analytics/clicks
   * Get detailed click analytics
   */
  getClickAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        partnerUserId: req.query.partnerUserId as string,
        period: (req.query.period as any) || 'month',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        groupBy: req.query.groupBy as string
      };

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && query.partnerUserId !== user.partnerId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own analytics',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analytics = await this.analyticsService.generateClickAnalytics(query);

      const response: ApiResponse = {
        success: true,
        data: analytics,
        message: 'Click analytics generated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate click analytics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/partner/analytics/performance
   * Get performance analytics with trends and recommendations
   */
  getPerformanceAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        partnerUserId: req.query.partnerUserId as string,
        period: (req.query.period as any) || 'month',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        metrics: req.query.metrics ? (req.query.metrics as string).split(',') : undefined
      };

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && query.partnerUserId !== user.partnerId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own analytics',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analytics = await this.analyticsService.generatePerformanceAnalytics(query);

      const response: ApiResponse = {
        success: true,
        data: analytics,
        message: 'Performance analytics generated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate performance analytics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/partner/analytics/funnel
   * Get conversion funnel analytics
   */
  getFunnelAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        partnerUserId: req.query.partnerUserId as string,
        period: (req.query.period as any) || 'month',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && query.partnerUserId !== user.partnerId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own analytics',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analytics = await this.analyticsService.generateFunnelAnalytics(query);

      const response: ApiResponse = {
        success: true,
        data: analytics,
        message: 'Funnel analytics generated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate funnel analytics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/partner/analytics/realtime
   * Get real-time analytics dashboard
   */
  getRealtimeAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const partnerUserId = req.query.partnerUserId as string;

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && partnerUserId && partnerUserId !== user.partnerId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own analytics',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analytics = await this.analyticsService.getRealtimeAnalytics(partnerUserId);

      const response: ApiResponse = {
        success: true,
        data: analytics,
        message: 'Realtime analytics retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get realtime analytics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/partner/analytics/predictions
   * Get predictive analytics and recommendations
   */
  getPredictiveAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const partnerUserId = req.query.partnerUserId as string || (req as any).user.partnerId;

      if (!partnerUserId) {
        res.status(400).json({
          success: false,
          error: 'Partner user ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && partnerUserId !== user.partnerId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own predictions',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const predictions = await this.analyticsService.generatePredictiveAnalytics(partnerUserId);

      const response: ApiResponse = {
        success: true,
        data: predictions,
        message: 'Predictive analytics generated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate predictive analytics',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/partner/dashboard/realtime
   * Get real-time dashboard data for admin
   */
  getRealtimeDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const dashboard = await this.eventService.getRealtimeDashboard();

      const response: ApiResponse = {
        success: true,
        data: dashboard,
        message: 'Realtime dashboard data retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get realtime dashboard',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * POST /api/v1/partner/reports/generate
   * Generate custom report (PDF/Excel)
   */
  generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, period, partnerIds, format } = req.body;

      // Validate input
      if (!type || !period || !format) {
        res.status(400).json({
          success: false,
          error: 'Type, period, and format are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin') {
        // Non-admin can only generate their own reports
        if (!partnerIds || partnerIds.length !== 1 || partnerIds[0] !== user.partnerId) {
          res.status(403).json({
            success: false,
            error: 'You can only generate reports for your own partner account',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Generate report data
      const reportData = await this.generateReportData(type, period, partnerIds);

      // Format response based on requested format
      if (format === 'json') {
        res.json({
          success: true,
          data: reportData,
          message: 'Report generated successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        // For PDF/Excel, return download URL (implement based on your file generation service)
        const downloadUrl = await this.createReportFile(reportData, format);
        
        res.json({
          success: true,
          data: { downloadUrl },
          message: `${format.toUpperCase()} report generated successfully`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to generate report',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  // Helper methods

  private async generateReportData(
    type: string,
    period: string,
    partnerIds?: string[]
  ): Promise<any> {
    const reportData: any = {
      type,
      period,
      generatedAt: new Date(),
      partners: []
    };

    // Generate data for each partner
    for (const partnerId of partnerIds || []) {
      const [clicks, performance, funnel] = await Promise.all([
        this.analyticsService.generateClickAnalytics({ partnerUserId: partnerId, period } as any),
        this.analyticsService.generatePerformanceAnalytics({ partnerUserId: partnerId, period } as any),
        this.analyticsService.generateFunnelAnalytics({ partnerUserId: partnerId, period } as any)
      ]);

      reportData.partners.push({
        partnerId,
        clicks,
        performance,
        funnel
      });
    }

    return reportData;
  }

  private async createReportFile(data: any, format: string): Promise<string> {
    // Implement file generation based on your requirements
    // This is a placeholder that returns a mock URL
    const fileId = Date.now().toString();
    return `/api/v1/partner/reports/download/${fileId}.${format}`;
  }
}