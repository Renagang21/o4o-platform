/**
 * @core O4O_PLATFORM_CORE — Approval
 * Core Routes: GET /admin/users, PATCH /admin/users/:id/status
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Router } from 'express';
import { AdminUserController } from '../../controllers/admin/AdminUserController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAnyRole, requireAdmin } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';
import { body } from 'express-validator';

const router: Router = Router();
const adminUserController = new AdminUserController();

// WO-OPERATOR-FIX-V1: Valid role patterns include service-prefixed roles
const LEGACY_ROLES = [
  'super_admin', 'admin', 'operator', 'manager', 'moderator',
  'vendor', 'seller', 'customer', 'business', 'partner', 'supplier', 'affiliate', 'user'
];
// Validate role: accept legacy roles OR service-prefixed roles (e.g., kpa:admin, neture:operator)
const isValidRole = (value: string) => {
  if (LEGACY_ROLES.includes(value)) return true;
  if (/^[a-z][a-z0-9-]*:[a-z][a-z_]*$/.test(value)) return true;
  throw new Error(`Invalid role: ${value}`);
};

// All admin user routes require authentication
router.use(authenticate);

// User management routes (admin/manager only)
router.get('/', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), adminUserController.getUsers);
router.get('/statistics', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), adminUserController.getUserStatistics);
router.get('/:id', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), adminUserController.getUser);

// User creation (admin only)
router.post('/',
  requireAdmin,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').optional().custom(isValidRole),
    body('roles').optional().isArray().withMessage('roles must be an array'),
    body('roles.*').optional().custom(isValidRole),
    body('status').optional().isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.createUser
);

// User updates (admin/manager only)
router.put('/:id',
  requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]),
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('role').optional().custom(isValidRole),
    body('roles').optional().isArray().withMessage('roles must be an array'),
    body('roles.*').optional().custom(isValidRole),
    body('status').optional().isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.updateUser
);

// Update user status (admin/manager only)
router.patch('/:id/status',
  requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]),
  [
    body('status').isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.updateUserStatus
);

// User deletion (admin only)
router.delete('/:id', requireAdmin, adminUserController.deleteUser);

export default router;