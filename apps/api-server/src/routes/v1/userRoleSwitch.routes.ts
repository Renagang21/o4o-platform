import { Router } from 'express';
import { UserRoleSwitchController } from '../../controllers/v1/userRoleSwitch.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ensureAuthenticated } from '../../middleware/permission.middleware.js';

const router: Router = Router();

// Switch active role (requires authentication)
router.patch(
  '/me/active-role',
  authenticate,
  ensureAuthenticated,
  UserRoleSwitchController.switchActiveRole
);

// Get current user's roles (requires authentication)
router.get(
  '/me/roles',
  authenticate,
  ensureAuthenticated,
  UserRoleSwitchController.getCurrentUserRoles
);

export default router;
