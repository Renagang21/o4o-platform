/**
 * Product Content Routes
 *
 * REST API routes for product content management.
 */

import { Router } from 'express';
import { ProductContentController } from '../controllers/ProductContentController.js';
import { ProductContentService } from '../services/ProductContentService.js';
import type { DataSource } from 'typeorm';

export function createProductContentRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductContentService(dataSource);
  const controller = new ProductContentController(service);

  // List product contents (with filtering)
  router.get('/', (req, res) => controller.list(req, res));

  // Get targeted product contents for current user
  router.get('/targeted', (req, res) => controller.getTargeted(req, res));

  // Get product contents by supplier
  router.get('/supplier/:supplierId', (req, res) =>
    controller.getBySupplier(req, res)
  );

  // Get product content by ID
  router.get('/:id', (req, res) => controller.getById(req, res));

  // Create product content
  router.post('/', (req, res) => controller.create(req, res));

  // Update product content
  router.patch('/:id', (req, res) => controller.update(req, res));

  // Publish product content
  router.post('/:id/publish', (req, res) => controller.publish(req, res));

  // Unpublish product content
  router.post('/:id/unpublish', (req, res) => controller.unpublish(req, res));

  // Deactivate product content
  router.patch('/:id/deactivate', (req, res) => controller.deactivate(req, res));

  // Activate product content
  router.patch('/:id/activate', (req, res) => controller.activate(req, res));

  // Delete product content (soft delete)
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}
