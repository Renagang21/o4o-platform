/**
 * Survey Campaign Routes
 *
 * REST API routes for survey campaign management.
 *
 * Phase R8: Survey Campaign Module
 */

import { Router } from 'express';
import { SurveyCampaignController } from '../controllers/SurveyCampaignController.js';
import type { DataSource } from 'typeorm';

export function createSurveyCampaignRoutes(dataSource: DataSource): Router {
  const router = Router();
  const controller = new SurveyCampaignController(dataSource);

  // List survey campaigns (with filtering)
  router.get('/', (req, res) => controller.findAll(req, res));

  // Get active campaigns for current user
  router.get('/active', (req, res) => controller.getActiveCampaigns(req, res));

  // Get survey campaigns by supplier
  router.get('/supplier/:supplierId', (req, res) =>
    controller.findBySupplier(req, res)
  );

  // Get survey campaign by ID
  router.get('/:id', (req, res) => controller.findById(req, res));

  // Get campaign statistics
  router.get('/:id/stats', (req, res) => controller.getStatistics(req, res));

  // Create survey campaign
  router.post('/', (req, res) => controller.create(req, res));

  // Submit survey response
  router.post('/:id/submit', (req, res) => controller.submitResponse(req, res));

  // Update survey campaign
  router.put('/:id', (req, res) => controller.update(req, res));

  // Publish survey campaign
  router.post('/:id/publish', (req, res) => controller.publish(req, res));

  // Unpublish survey campaign
  router.post('/:id/unpublish', (req, res) => controller.unpublish(req, res));

  // End survey campaign
  router.post('/:id/end', (req, res) => controller.end(req, res));

  // Delete survey campaign (soft delete)
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}
