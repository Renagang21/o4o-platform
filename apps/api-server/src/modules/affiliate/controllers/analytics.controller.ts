import { Request, Response, NextFunction } from 'express';
import { AdvancedAnalyticsService } from '../services/analytics.service';
import { AffiliateEventService } from '../services/event.service';
import { ApiResponse } from '../dto/response.dto';

export class AnalyticsController {
  private analyticsService: AdvancedAnalyticsService;
  private eventService: AffiliateEventService;

  constructor() {
    this.analyticsService = new AdvancedAnalyticsService();
    this.eventService = new AffiliateEventService();
  }

  /**
   * GET /api/v1/affiliate/analytics/clicks
   * Get detailed click analytics
   */
  getClickAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        affiliateUserId: req.query.affiliateUserId as string,
        period: (req.query.period as any) || 'month',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        groupBy: req.query.groupBy as string
      };

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && query.affiliateUserId !== user.affiliateId) {
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
   * GET /api/v1/affiliate/analytics/performance
   * Get performance analytics with trends and recommendations
   */
  getPerformanceAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        affiliateUserId: req.query.affiliateUserId as string,
        period: (req.query.period as any) || 'month',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        metrics: req.query.metrics ? (req.query.metrics as string).split(',') : undefined
      };

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && query.affiliateUserId !== user.affiliateId) {
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
   * GET /api/v1/affiliate/analytics/funnel
   * Get conversion funnel analytics
   */
  getFunnelAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        affiliateUserId: req.query.affiliateUserId as string,
        period: (req.query.period as any) || 'month',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && query.affiliateUserId !== user.affiliateId) {
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
   * GET /api/v1/affiliate/analytics/realtime
   * Get real-time analytics dashboard
   */
  getRealtimeAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const affiliateUserId = req.query.affiliateUserId as string;

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && affiliateUserId && affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own analytics',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analytics = await this.analyticsService.getRealtimeAnalytics(affiliateUserId);

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
   * GET /api/v1/affiliate/analytics/predictions
   * Get predictive analytics and recommendations
   */
  getPredictiveAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const affiliateUserId = req.query.affiliateUserId as string || (req as any).user.affiliateId;

      if (!affiliateUserId) {
        res.status(400).json({
          success: false,
          error: 'Affiliate user ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own predictions',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const predictions = await this.analyticsService.generatePredictiveAnalytics(affiliateUserId);

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
   * GET /api/v1/affiliate/dashboard/realtime
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
   * POST /api/v1/affiliate/reports/generate
   * Generate custom report (PDF/Excel)
   */
  generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, period, affiliateIds, format } = req.body;

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
        if (!affiliateIds || affiliateIds.length !== 1 || affiliateIds[0] !== user.affiliateId) {
          res.status(403).json({
            success: false,
            error: 'You can only generate reports for your own affiliate account',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Generate report data
      const reportData = await this.generateReportData(type, period, affiliateIds);

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
    affiliateIds?: string[]
  ): Promise<any> {
    const reportData: any = {
      type,
      period,
      generatedAt: new Date(),
      affiliates: []
    };

    // Generate data for each affiliate
    for (const affiliateId of affiliateIds || []) {
      const [clicks, performance, funnel] = await Promise.all([
        this.analyticsService.generateClickAnalytics({ affiliateUserId: affiliateId, period } as any),
        this.analyticsService.generatePerformanceAnalytics({ affiliateUserId: affiliateId, period } as any),
        this.analyticsService.generateFunnelAnalytics({ affiliateUserId: affiliateId, period } as any)
      ]);

      reportData.affiliates.push({
        affiliateId,
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
    return `/api/v1/affiliate/reports/download/${fileId}.${format}`;
  }
}