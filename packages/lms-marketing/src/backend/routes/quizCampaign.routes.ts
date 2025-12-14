/**
 * Quiz Campaign Routes
 *
 * REST API routes for quiz campaign management.
 */

import { Router } from 'express';
import { MarketingQuizCampaignController } from '../controllers/MarketingQuizCampaignController.js';
import { MarketingQuizCampaignService } from '../services/MarketingQuizCampaignService.js';
import type { DataSource } from 'typeorm';

export function createQuizCampaignRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new MarketingQuizCampaignService(dataSource);
  const controller = new MarketingQuizCampaignController(service);

  // List quiz campaigns (with filtering)
  router.get('/', (req, res) => controller.list(req, res));

  // Get targeted quiz campaigns for current user
  router.get('/targeted', (req, res) => controller.getTargeted(req, res));

  // Get quiz campaigns by supplier
  router.get('/supplier/:supplierId', (req, res) =>
    controller.getBySupplier(req, res)
  );

  // Get quiz campaign by ID
  router.get('/:id', (req, res) => controller.getById(req, res));

  // Get campaign statistics
  router.get('/:id/statistics', (req, res) => controller.getStatistics(req, res));

  // Create quiz campaign
  router.post('/', (req, res) => controller.create(req, res));

  // Record quiz attempt
  router.post('/:id/attempt', (req, res) => controller.recordAttempt(req, res));

  // Update quiz campaign
  router.patch('/:id', (req, res) => controller.update(req, res));

  // Publish quiz campaign
  router.post('/:id/publish', (req, res) => controller.publish(req, res));

  // Unpublish quiz campaign
  router.post('/:id/unpublish', (req, res) => controller.unpublish(req, res));

  // Deactivate quiz campaign
  router.patch('/:id/deactivate', (req, res) => controller.deactivate(req, res));

  // Activate quiz campaign
  router.patch('/:id/activate', (req, res) => controller.activate(req, res));

  // Delete quiz campaign (soft delete)
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}
