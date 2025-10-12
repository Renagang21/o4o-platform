import { Router, Request } from 'express';
import { UserRoleController } from '../../controllers/v1/userRole.controller';
import { authenticate } from '../../middleware/auth.middleware';
// New unified permission middleware
import {
  ensureAuthenticated,
  requireAdmin,
  requireSelfOrAdmin
} from '../../middleware/permission.middleware';

const router: Router = Router();

// Role management routes
router.get('/roles', UserRoleController.getRoles);  // Public endpoint - just returns role definitions
router.get('/roles/statistics', ensureAuthenticated, requireAdmin, UserRoleController.getRoleStatistics);
router.get('/permissions', ensureAuthenticated, UserRoleController.getPermissions);

// User role routes
router.get('/:id/role', ensureAuthenticated, requireSelfOrAdmin(), UserRoleController.getUserRole);
router.put('/:id/role', ensureAuthenticated, requireAdmin, UserRoleController.updateUserRole);
router.get('/:id/permissions', ensureAuthenticated, requireSelfOrAdmin(), UserRoleController.getUserPermissions);
router.get('/:id/permissions/check', ensureAuthenticated, requireSelfOrAdmin(), UserRoleController.checkUserPermission);

export default router;