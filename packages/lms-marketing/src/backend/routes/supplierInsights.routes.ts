/**
 * Supplier Insights Routes
 *
 * REST API routes for supplier engagement analytics.
 *
 * Phase R9: Engagement Dashboard for Suppliers
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SupplierInsightsController } from '../controllers/SupplierInsightsController.js';

export function createSupplierInsightsRoutes(_dataSource: DataSource): Router {
  const router = Router();
  const controller = new SupplierInsightsController();

  /**
   * GET /api/v1/lms-marketing/insights/dashboard/:supplierId
   * Get dashboard summary for a supplier
   */
  router.get('/dashboard/:supplierId', (req, res) =>
    controller.getDashboardSummary(req, res)
  );

  /**
   * GET /api/v1/lms-marketing/insights/performance/:supplierId
   * Get campaign performance list for a supplier
   * Query params: type, status, startDate, endDate, page, limit
   */
  router.get('/performance/:supplierId', (req, res) =>
    controller.getCampaignPerformance(req, res)
  );

  /**
   * GET /api/v1/lms-marketing/insights/trends/:supplierId
   * Get engagement trends for a supplier
   * Query params: period (day|week|month), startDate, endDate
   */
  router.get('/trends/:supplierId', (req, res) =>
    controller.getEngagementTrends(req, res)
  );

  /**
   * GET /api/v1/lms-marketing/insights/activity/:supplierId
   * Get recent activity for a supplier
   * Query params: limit
   */
  router.get('/activity/:supplierId', (req, res) =>
    controller.getRecentActivity(req, res)
  );

  /**
   * GET /api/v1/lms-marketing/insights/top/:supplierId
   * Get top performing campaigns for a supplier
   * Query params: limit
   */
  router.get('/top/:supplierId', (req, res) =>
    controller.getTopCampaigns(req, res)
  );

  /**
   * GET /api/v1/lms-marketing/insights/campaign/:type/:campaignId
   * Get detailed analytics for a specific campaign
   * type: quiz | survey
   */
  router.get('/campaign/:type/:campaignId', (req, res) =>
    controller.getCampaignAnalytics(req, res)
  );

  /**
   * GET /api/v1/lms-marketing/insights/export/:supplierId
   * Export campaign data for a supplier
   * Query params: format (json|csv), type, startDate, endDate
   */
  router.get('/export/:supplierId', (req, res) => controller.exportData(req, res));

  return router;
}
