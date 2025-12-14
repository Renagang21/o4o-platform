/**
 * LMS-Marketing Backend Entry Point
 *
 * AppStore 표준 준수를 위한 backend exports
 * Phase R6: Product Content delivery implementation
 * Phase R7: Quiz Campaign implementation
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createProductContentRoutes } from './routes/productContent.routes.js';
import { createQuizCampaignRoutes } from './routes/quizCampaign.routes.js';
import { initProductContentService } from './services/ProductContentService.js';
import { initMarketingQuizCampaignService } from './services/MarketingQuizCampaignService.js';

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
      version: '0.3.0',
      phase: 'R7-quiz-campaign',
    });
  });

  // Phase R6: Product Content routes
  router.use('/product', createProductContentRoutes(dataSource));

  // Phase R7: Quiz Campaign routes
  router.use('/quiz-campaign', createQuizCampaignRoutes(dataSource));

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
    quizCampaign: initMarketingQuizCampaignService(dataSource),

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
  const quizCampaignService = initMarketingQuizCampaignService(dataSource);

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
     * Usage: context.hooks.createQuizCampaign({ supplierId, bundleId, title, ... })
     */
    createQuizCampaign: async (payload: {
      supplierId: string;
      bundleId?: string;
      title: string;
      description?: string;
      questions?: Array<{
        id: string;
        type: 'single_choice' | 'multiple_choice' | 'true_false';
        question: string;
        options: Array<{ id: string; text: string; imageUrl?: string }>;
        correctAnswers: string[];
        points: number;
        explanation?: string;
        order: number;
      }>;
      targeting?: {
        targets: ('seller' | 'consumer' | 'pharmacist' | 'all')[];
        regions?: string[];
        tags?: string[];
        sellerTypes?: string[];
      };
      rewards?: Array<{
        type: 'points' | 'coupon' | 'badge' | 'certificate';
        value: string;
        minScorePercent: number;
        description?: string;
      }>;
      startDate?: Date;
      endDate?: Date;
      metadata?: Record<string, unknown>;
    }) => {
      console.log('[lms-marketing] createQuizCampaign hook called', payload);
      try {
        const campaign = await quizCampaignService.create({
          supplierId: payload.supplierId,
          bundleId: payload.bundleId,
          title: payload.title,
          description: payload.description,
          questions: payload.questions,
          targeting: payload.targeting,
          rewards: payload.rewards,
          startDate: payload.startDate,
          endDate: payload.endDate,
          metadata: payload.metadata,
        });

        return {
          success: true,
          data: campaign,
          message: 'Quiz campaign created successfully'
        };
      } catch (error) {
        console.error('[lms-marketing] createQuizCampaign error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    /**
     * Get quiz campaigns for user
     * Usage: context.hooks.getQuizCampaignsForUser({ role, region, ... })
     */
    getQuizCampaignsForUser: async (payload: {
      role: 'seller' | 'consumer' | 'pharmacist' | 'all';
      region?: string;
      sellerType?: string;
      tags?: string[];
    }) => {
      console.log('[lms-marketing] getQuizCampaignsForUser hook called', payload);
      try {
        const campaigns = await quizCampaignService.getForUser(payload);
        return {
          success: true,
          data: campaigns,
          total: campaigns.length
        };
      } catch (error) {
        console.error('[lms-marketing] getQuizCampaignsForUser error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
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
