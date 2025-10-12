import { Router } from 'express';
import { UserRoleSwitchController } from '../../controllers/v1/userRoleSwitch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureAuthenticated } from '../../middleware/permission.middleware';

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
