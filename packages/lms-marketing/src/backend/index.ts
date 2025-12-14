/**
 * LMS-Marketing Backend Entry Point
 *
 * AppStore 표준 준수를 위한 backend exports
 * Phase R6: Product Content delivery implementation
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createProductContentRoutes } from './routes/productContent.routes.js';
import { initProductContentService } from './services/ProductContentService.js';

/**
 * Create routes for marketing extension
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'lms-marketing',
      version: '0.2.0',
      phase: 'R6-product-info',
    });
  });

  // Phase R6: Product Content routes
  router.use('/product', createProductContentRoutes(dataSource));

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
 */
export function createServices(dataSource: DataSource) {
  return {
    // Phase R6: Product Content Service
    productContent: initProductContentService(dataSource),

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
 */
export function createHooks(dataSource: DataSource) {
  const productContentService = initProductContentService(dataSource);

  return {
    /**
     * Publish product info content
     * Usage: context.hooks.publishProductInfo({ supplierId, bundleId, ... })
     */
    publishProductInfo: async (payload: {
      supplierId: string;
      bundleId: string;
      title: string;
      targeting?: {
        targets: ('seller' | 'consumer' | 'pharmacist' | 'all')[];
        regions?: string[];
        tags?: string[];
        sellerTypes?: string[];
      };
      metadata?: Record<string, unknown>;
    }) => {
      console.log('[lms-marketing] publishProductInfo hook called', payload);
      try {
        const content = await productContentService.create({
          supplierId: payload.supplierId,
          bundleId: payload.bundleId,
          title: payload.title,
          targeting: payload.targeting,
          metadata: payload.metadata,
        });

        // Auto-publish
        const published = await productContentService.publish(content.id);

        return {
          success: true,
          data: published,
          message: 'Product content published successfully'
        };
      } catch (error) {
        console.error('[lms-marketing] publishProductInfo error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Get product contents for user
     * Usage: context.hooks.getProductContentsForUser({ role, region, ... })
     */
    getProductContentsForUser: async (payload: {
      role: 'seller' | 'consumer' | 'pharmacist' | 'all';
      region?: string;
      sellerType?: string;
      tags?: string[];
    }) => {
      console.log('[lms-marketing] getProductContentsForUser hook called', payload);
      try {
        const contents = await productContentService.getForUser(payload);
        return {
          success: true,
          data: contents,
          total: contents.length
        };
      } catch (error) {
        console.error('[lms-marketing] getProductContentsForUser error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
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
export * from './routes/index.js';
