/**
 * Influencer Routine Routes
 *
 * Defines API routes for influencer routine management
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { InfluencerRoutineController } from '../controllers/influencer-routine.controller.js';
import { InfluencerRoutineService } from '../services/influencer-routine.service.js';
import {
  requirePermission,
  CosmeticsPermissions,
} from '../middleware/permissions.middleware.js';

export function createInfluencerRoutineRoutes(dataSource: DataSource): Router {
  const router = Router();
  const routineService = new InfluencerRoutineService(dataSource);
  const controller = new InfluencerRoutineController(routineService);

  // POST /api/v1/partner/routines - Create new routine
  // Required permission: cosmetics:recommend_routine
  router.post(
    '/',
    requirePermission(CosmeticsPermissions.RECOMMEND_ROUTINE),
    (req, res) => controller.createRoutine(req, res)
  );

  // GET /api/v1/partner/routines - Get routines
  // Query params: partnerId, skinType, concerns, timeOfUse, tags
  router.get('/', (req, res) => controller.getRoutines(req, res));

  // GET /api/v1/partner/routines/:id - Get routine by ID
  router.get('/:id', (req, res) => controller.getRoutineById(req, res));

  // PUT /api/v1/partner/routines/:id - Update routine
  // Required permission: cosmetics:recommend_routine (own routine) or admin
  router.put(
    '/:id',
    requirePermission(CosmeticsPermissions.RECOMMEND_ROUTINE),
    (req, res) => controller.updateRoutine(req, res)
  );

  // DELETE /api/v1/partner/routines/:id - Delete routine
  // Required permission: cosmetics:recommend_routine (own routine) or admin
  router.delete(
    '/:id',
    requirePermission(CosmeticsPermissions.RECOMMEND_ROUTINE),
    (req, res) => controller.deleteRoutine(req, res)
  );

  // POST /api/v1/partner/routines/:id/recommend - Recommend routine
  router.post('/:id/recommend', (req, res) =>
    controller.recommendRoutine(req, res)
  );

  return router;
}

export default createInfluencerRoutineRoutes;
