/**
 * CampaignAutomationController
 *
 * REST API controller for campaign automation management.
 * Phase R11: Marketing Automation System
 */

import type { Request, Response } from 'express';
import {
  CampaignAutomationService,
  type AutomationSettings,
  type AutomationRuleType,
} from '../services/CampaignAutomationService.js';

export class CampaignAutomationController {
  constructor(private service: CampaignAutomationService) {}

  /**
   * GET /api/v1/lms-marketing/automation/settings
   * Get automation settings
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = this.service.getSettings();
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error('[CampaignAutomationController] getSettings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get automation settings',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/automation/settings
   * Update automation settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const updates: Partial<AutomationSettings> = req.body;
      const settings = this.service.updateSettings(updates);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error('[CampaignAutomationController] updateSettings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update automation settings',
      });
    }
  }

  /**
   * GET /api/v1/lms-marketing/automation/logs
   * Get automation logs
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { limit, ruleType } = req.query;

      const logs = this.service.getLogs({
        limit: limit ? parseInt(limit as string, 10) : undefined,
        ruleType: ruleType as AutomationRuleType | undefined,
      });

      res.json({
        success: true,
        data: logs,
        total: logs.length,
      });
    } catch (error) {
      console.error('[CampaignAutomationController] getLogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get automation logs',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/automation/run
   * Manually trigger automation run
   */
  async runAutomation(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.runAllAutomation();
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[CampaignAutomationController] runAutomation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run automation',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/automation/run/publish
   * Run only auto-publish scheduled campaigns
   */
  async runAutoPublish(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.autoPublishScheduledCampaigns();
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[CampaignAutomationController] runAutoPublish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run auto-publish',
      });
    }
  }

  /**
   * POST /api/v1/lms-marketing/automation/run/expire
   * Run only auto-end expired campaigns
   */
  async runAutoExpire(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.autoEndExpiredCampaigns();
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[CampaignAutomationController] runAutoExpire error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run auto-expire',
      });
    }
  }

  /**
   * DELETE /api/v1/lms-marketing/automation/logs
   * Clear automation logs
   */
  async clearLogs(req: Request, res: Response): Promise<void> {
    try {
      this.service.clearLogs();
      res.json({
        success: true,
        message: 'Automation logs cleared',
      });
    } catch (error) {
      console.error('[CampaignAutomationController] clearLogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear automation logs',
      });
    }
  }
}
