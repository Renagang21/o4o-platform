/**
 * TEMPLATE: Resource Routes
 *
 * Copy this file and replace:
 * - RESOURCE_NAME (e.g., Product, User, Order)
 * - RESOURCE_LOWER (e.g., product, user, order)
 * - DOMAIN (e.g., commerce, auth, dropshipping)
 */

import { Router } from 'express';
import { RESOURCE_NAMEController } from '../controllers/RESOURCE_LOWER.controller.js';
import {
  validateDto,
  validateQuery,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  requireRole,
} from '../../../common/middleware/auth.middleware.js';
import {
  CreateRESOURCE_NAMEDto,
  UpdateRESOURCE_NAMEDto,
  RESOURCE_NAMEListQueryDto,
} from '../dto/RESOURCE_LOWER.dto.js';

const router = Router();

/**
 * Public Routes (no authentication required)
 */

// List all RESOURCE_NAMEs (public, with filters)
router.get(
  '/',
  validateQuery(RESOURCE_NAMEListQueryDto),
  RESOURCE_NAMEController.list
);

// Get single RESOURCE_NAME by ID (public)
router.get('/:id', RESOURCE_NAMEController.getById);

/**
 * Protected Routes (authentication required)
 */

// Create new RESOURCE_NAME (requires authentication)
router.post(
  '/',
  requireAuth,
  validateDto(CreateRESOURCE_NAMEDto),
  RESOURCE_NAMEController.create
);

// Update RESOURCE_NAME (requires authentication)
router.put(
  '/:id',
  requireAuth,
  validateDto(UpdateRESOURCE_NAMEDto),
  RESOURCE_NAMEController.update
);

// Delete RESOURCE_NAME (requires authentication)
router.delete('/:id', requireAuth, RESOURCE_NAMEController.delete);

/**
 * Admin-Only Routes
 */

// Example: Approve RESOURCE_NAME (admin only)
// router.post(
//   '/:id/approve',
//   requireRole(['admin', 'operator']),
//   RESOURCE_NAMEController.approve
// );

/**
 * Custom Action Routes
 */

// Example: Custom action - publish RESOURCE_NAME
// router.post(
//   '/:id/publish',
//   requireAuth,
//   RESOURCE_NAMEController.publish
// );

// Example: Custom action - archive RESOURCE_NAME
// router.post(
//   '/:id/archive',
//   requireAuth,
//   RESOURCE_NAMEController.archive
// );

export default router;
