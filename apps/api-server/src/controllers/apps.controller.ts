/**
 * Apps Controller
 * Handles App system API endpoints
 */

import { Request, Response } from 'express';
import { appRegistry } from '../services/app-registry.service.js';
import { googleAI } from '../services/google-ai.service.js';
import logger from '../utils/logger.js';

export class AppsController {
  /**
   * GET /api/v1/apps
   * Get all active apps
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { provider, category } = req.query;

      let apps;
      if (provider) {
        apps = await appRegistry.getByProvider(provider as string);
      } else if (category) {
        apps = await appRegistry.getByCategory(category as string);
      } else {
        apps = await appRegistry.getAllActive();
      }

      res.json({
        success: true,
        data: apps
      });
    } catch (error: any) {
      logger.error('Error fetching apps:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/apps/:slug
   * Get app by slug
   */
  async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const app = await appRegistry.getBySlug(slug);

      if (!app) {
        res.status(404).json({
          success: false,
          error: 'App not found'
        });
        return;
      }

      res.json({
        success: true,
        data: app
      });
    } catch (error: any) {
      logger.error('Error fetching app:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/apps/:slug/install
   * Install an app
   */
  async install(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { config, businessId = null } = req.body;

      const instance = await appRegistry.install(slug, businessId, config);

      res.json({
        success: true,
        data: instance
      });
    } catch (error: any) {
      logger.error('Error installing app:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/apps/:slug/instance
   * Get app instance
   */
  async getInstance(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const businessId = req.query.businessId as string | undefined;

      const instance = await appRegistry.getInstance(slug, businessId || null);

      if (!instance) {
        res.status(404).json({
          success: false,
          error: 'App instance not found'
        });
        return;
      }

      res.json({
        success: true,
        data: instance
      });
    } catch (error: any) {
      logger.error('Error fetching app instance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/v1/apps/:slug/config
   * Update app configuration
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { config, businessId = null } = req.body;

      const instance = await appRegistry.updateConfig(slug, config, businessId);

      res.json({
        success: true,
        data: instance,
        message: 'App configuration updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating app config:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/apps/:slug/execute
   * Execute app action
   */
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { action, payload, businessId = null } = req.body;
      const userId = (req as any).user?.id; // From auth middleware

      if (!action) {
        res.status(400).json({
          success: false,
          error: 'Action is required'
        });
        return;
      }

      if (!payload) {
        res.status(400).json({
          success: false,
          error: 'Payload is required'
        });
        return;
      }

      const result = await appRegistry.execute({
        appSlug: slug,
        action,
        payload,
        userId,
        businessId
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      logger.error('Error executing app:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/apps/:slug/usage
   * Get app usage statistics
   */
  async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { businessId, userId, startDate, endDate } = req.query;

      const stats = await appRegistry.getUsageStats({
        appSlug: slug,
        businessId: businessId as string | undefined,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching app usage:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/apps/usage/overall
   * Get overall usage statistics across all apps
   */
  async getOverallUsage(req: Request, res: Response): Promise<void> {
    try {
      const { businessId, userId, startDate, endDate } = req.query;

      const stats = await appRegistry.getUsageStats({
        businessId: businessId as string | undefined,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching overall usage:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const appsController = new AppsController();
