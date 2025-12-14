/**
 * SupplierInsightsController
 *
 * REST API controller for supplier engagement analytics.
 *
 * Phase R9: Engagement Dashboard for Suppliers
 */

import type { Request, Response } from 'express';
import {
  getSupplierInsightsService,
  type ExportFormat,
} from '../services/SupplierInsightsService.js';

/**
 * SupplierInsightsController
 */
export class SupplierInsightsController {
  /**
   * GET /api/v1/lms-marketing/insights/dashboard/:supplierId
   * Get dashboard summary for a supplier
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;

      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID is required' });
        return;
      }

      const service = getSupplierInsightsService();
      const summary = await service.getDashboardSummary(supplierId);

      res.json(summary);
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      res.status(500).json({
        error: 'Failed to get dashboard summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/insights/performance/:supplierId
   * Get campaign performance list for a supplier
   */
  async getCampaignPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const {
        type,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID is required' });
        return;
      }

      const service = getSupplierInsightsService();
      const result = await service.getCampaignPerformance(supplierId, {
        type: type as 'product' | 'quiz' | 'survey' | undefined,
        status: status as string | undefined,
        dateRange: {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        },
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting campaign performance:', error);
      res.status(500).json({
        error: 'Failed to get campaign performance',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/insights/trends/:supplierId
   * Get engagement trends for a supplier
   */
  async getEngagementTrends(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { period = 'week', startDate, endDate } = req.query;

      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID is required' });
        return;
      }

      const service = getSupplierInsightsService();
      const trends = await service.getEngagementTrends(
        supplierId,
        period as 'day' | 'week' | 'month',
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        }
      );

      res.json(trends);
    } catch (error) {
      console.error('Error getting engagement trends:', error);
      res.status(500).json({
        error: 'Failed to get engagement trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/insights/activity/:supplierId
   * Get recent activity for a supplier
   */
  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { limit = '10' } = req.query;

      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID is required' });
        return;
      }

      const service = getSupplierInsightsService();
      const activity = await service.getRecentActivity(
        supplierId,
        parseInt(limit as string, 10)
      );

      res.json(activity);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      res.status(500).json({
        error: 'Failed to get recent activity',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/insights/top/:supplierId
   * Get top performing campaigns for a supplier
   */
  async getTopCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { limit = '5' } = req.query;

      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID is required' });
        return;
      }

      const service = getSupplierInsightsService();
      const topCampaigns = await service.getTopCampaigns(
        supplierId,
        parseInt(limit as string, 10)
      );

      res.json(topCampaigns);
    } catch (error) {
      console.error('Error getting top campaigns:', error);
      res.status(500).json({
        error: 'Failed to get top campaigns',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/insights/campaign/:type/:campaignId
   * Get detailed analytics for a specific campaign
   */
  async getCampaignAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { type, campaignId } = req.params;

      if (!type || !campaignId) {
        res.status(400).json({ error: 'Type and campaign ID are required' });
        return;
      }

      if (type !== 'quiz' && type !== 'survey') {
        res.status(400).json({ error: 'Type must be "quiz" or "survey"' });
        return;
      }

      const service = getSupplierInsightsService();
      const analytics = await service.getCampaignAnalytics(
        campaignId,
        type as 'quiz' | 'survey'
      );

      if (!analytics) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.json(analytics);
    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      res.status(500).json({
        error: 'Failed to get campaign analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/insights/export/:supplierId
   * Export campaign data for a supplier
   */
  async exportData(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { format = 'csv', type, startDate, endDate } = req.query;

      if (!supplierId) {
        res.status(400).json({ error: 'Supplier ID is required' });
        return;
      }

      const validFormats: ExportFormat[] = ['json', 'csv'];
      if (!validFormats.includes(format as ExportFormat)) {
        res.status(400).json({ error: 'Format must be "json" or "csv"' });
        return;
      }

      const service = getSupplierInsightsService();
      const exportData = await service.exportCampaignData(supplierId, {
        format: format as ExportFormat,
        type: type as 'product' | 'quiz' | 'survey' | undefined,
        dateRange: {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        },
      });

      res.setHeader('Content-Type', exportData.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exportData.filename}"`
      );
      res.send(exportData.data);
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
