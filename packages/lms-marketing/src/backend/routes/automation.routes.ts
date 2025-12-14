/**
 * Campaign Automation Routes
 *
 * REST API routes for campaign automation management.
 * Phase R11: Marketing Automation System
 */

import { Router } from 'express';
import { CampaignAutomationController } from '../controllers/CampaignAutomationController.js';
import { initCampaignAutomationService } from '../services/CampaignAutomationService.js';
import type { DataSource } from 'typeorm';

export function createAutomationRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = initCampaignAutomationService(dataSource);
  const controller = new CampaignAutomationController(service);

  // Get automation settings
  router.get('/settings', (req, res) => controller.getSettings(req, res));

  // Update automation settings
  router.post('/settings', (req, res) => controller.updateSettings(req, res));

  // Get automation logs
  router.get('/logs', (req, res) => controller.getLogs(req, res));

  // Clear automation logs
  router.delete('/logs', (req, res) => controller.clearLogs(req, res));

  // Run all automation rules
  router.post('/run', (req, res) => controller.runAutomation(req, res));

  // Run specific automation rules
  router.post('/run/publish', (req, res) => controller.runAutoPublish(req, res));
  router.post('/run/expire', (req, res) => controller.runAutoExpire(req, res));

  return router;
}
