import { Router } from 'express';
import { VerificationController } from '../controllers/VerificationController.js';
import { VerificationService } from '../services/VerificationService.js';
import { DataSource } from 'typeorm';

/**
 * Create Verification Routes
 */
export function createVerificationRoutes(dataSource: DataSource): Router {
  const router = Router();
  const verificationService = new VerificationService(dataSource);
  const controller = new VerificationController(verificationService);

  // GET /api/membership/verifications
  router.get('/', (req, res) => controller.list(req, res));

  // GET /api/membership/verifications/:id
  router.get('/:id', (req, res) => controller.get(req, res));

  // POST /api/membership/verifications
  router.post('/', (req, res) => controller.create(req, res));

  // PATCH /api/membership/verifications/:id/approve
  router.patch('/:id/approve', (req, res) => controller.approve(req, res));

  // PATCH /api/membership/verifications/:id/reject
  router.patch('/:id/reject', (req, res) => controller.reject(req, res));

  return router;
}
