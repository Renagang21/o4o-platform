import { Router, Request } from 'express';
import { UserRoleController } from '../../controllers/v1/userRole.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
// New unified permission middleware
import {
  ensureAuthenticated,
  requireAdmin,
  requireSelfOrAdmin
} from '../../middleware/permission.middleware.js';

const router: Router = Router();

// Role management routes
router.get('/roles', UserRoleController.getRoles);  // Public endpoint - just returns role definitions
router.get('/roles/statistics', authenticate, ensureAuthenticated, requireAdmin, UserRoleController.getRoleStatistics);
router.get('/permissions', authenticate, ensureAuthenticated, UserRoleController.getPermissions);

// User role routes
router.get('/:id/role', authenticate, ensureAuthenticated, requireSelfOrAdmin(), UserRoleController.getUserRole);
router.put('/:id/role', authenticate, ensureAuthenticated, requireAdmin, UserRoleController.updateUserRole);
router.get('/:id/permissions', authenticate, ensureAuthenticated, requireSelfOrAdmin(), UserRoleController.getUserPermissions);
router.get('/:id/permissions/check', authenticate, ensureAuthenticated, requireSelfOrAdmin(), UserRoleController.checkUserPermission);

export default router;