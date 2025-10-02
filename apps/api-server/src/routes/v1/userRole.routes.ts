import { Router } from 'express';
import { UserRoleController } from '../../controllers/v1/userRole.controller';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

const router: Router = Router();

// Role management routes
router.get('/roles', authenticateToken, UserRoleController.getRoles);
router.get('/roles/statistics', authenticateToken, requireAdmin, UserRoleController.getRoleStatistics);
router.get('/permissions', authenticateToken, UserRoleController.getPermissions);

// User role routes
router.get('/:id/role', authenticateToken, UserRoleController.getUserRole);
router.put('/:id/role', authenticateToken, requireAdmin, UserRoleController.updateUserRole);
router.get('/:id/permissions/check', authenticateToken, UserRoleController.checkUserPermission);

export default router;