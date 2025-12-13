/**
 * LMS-Marketing Backend Entry Point
 *
 * AppStore 표준 준수를 위한 backend exports
 * Phase R5: Bootstrap skeleton
 * Phase R6+: Actual implementation
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

/**
 * Create routes for marketing extension
 * Phase R5: Empty router skeleton
 * Phase R6+: Product info, campaign routes
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'lms-marketing',
      version: '0.1.0',
      phase: 'R5-bootstrap',
    });
  });

  // Phase R6: Product Info routes
  // router.use('/product-info', createProductInfoRoutes(dataSource));

  // Phase R7: Quiz Campaign routes
  // router.use('/campaigns/quiz', createQuizCampaignRoutes(dataSource));

  // Phase R8: Survey Campaign routes
  // router.use('/campaigns/survey', createSurveyCampaignRoutes(dataSource));

  // Phase R9: Analytics routes
  // router.use('/analytics', createAnalyticsRoutes(dataSource));

  return router;
}

/**
 * Create services for marketing extension
 * Phase R5: Empty service registry
 * Phase R6+: Actual services
 */
export function createServices(dataSource: DataSource) {
  return {
    // Phase R6: Product Info Service
    // productInfo: initProductInfoService(dataSource),

    // Phase R7: Quiz Campaign Service
    // quizCampaign: initQuizCampaignService(dataSource),

    // Phase R8: Survey Campaign Service
    // surveyCampaign: initSurveyCampaignService(dataSource),

    // Phase R9: Analytics Service
    // analytics: initAnalyticsService(dataSource),
  };
}

/**
 * Create hooks for extension apps
 * These hooks allow other extensions to interact with marketing features
 * Phase R5: Empty hooks registry
 * Phase R6+: Actual hooks
 */
export function createHooks(dataSource: DataSource) {
  return {
    /**
     * Publish product info content
     * Usage: context.hooks.publishProductInfo({ supplierId, bundleId, ... })
     */
    publishProductInfo: async (payload: {
      supplierId: string;
      bundleId: string;
      targetAudience?: string[];
      metadata?: Record<string, unknown>;
    }) => {
      console.log('[lms-marketing] publishProductInfo hook called (Phase R6)', payload);
      // Phase R6: Actual implementation
      return { success: true, message: 'Hook registered (Phase R6 implementation pending)' };
    },

    /**
     * Create quiz campaign
     * Usage: context.hooks.createQuizCampaign({ supplierId, quizId, ... })
     */
    createQuizCampaign: async (payload: {
      supplierId: string;
      quizId: string;
      title: string;
      startAt?: Date;
      endAt?: Date;
      metadata?: Record<string, unknown>;
    }) => {
      console.log('[lms-marketing] createQuizCampaign hook called (Phase R7)', payload);
      // Phase R7: Actual implementation
      return { success: true, message: 'Hook registered (Phase R7 implementation pending)' };
    },

    /**
     * Create survey campaign
     * Usage: context.hooks.createSurveyCampaign({ supplierId, surveyId, ... })
     */
    createSurveyCampaign: async (payload: {
      supplierId: string;
      surveyId: string;
      title: string;
      startAt?: Date;
      endAt?: Date;
      metadata?: Record<string, unknown>;
    }) => {
      console.log('[lms-marketing] createSurveyCampaign hook called (Phase R8)', payload);
      // Phase R8: Actual implementation
      return { success: true, message: 'Hook registered (Phase R8 implementation pending)' };
    },

    /**
     * Get campaign analytics
     * Usage: context.hooks.getCampaignAnalytics({ campaignId })
     */
    getCampaignAnalytics: async (payload: {
      campaignId: string;
      startDate?: Date;
      endDate?: Date;
    }) => {
      console.log('[lms-marketing] getCampaignAnalytics hook called (Phase R9)', payload);
      // Phase R9: Actual implementation
      return {
        success: true,
        message: 'Hook registered (Phase R9 implementation pending)',
        data: null,
      };
    },
  };
}

// Re-export for convenience
export * from './entities/index.js';
export * from './services/index.js';
export * from './controllers/index.js';
