/**
 * @core O4O_PLATFORM_CORE — Approval
 * Core Routes: GET /admin/users, PATCH /admin/users/:id/status
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Router } from 'express';
import { AdminUserController } from '../../controllers/admin/AdminUserController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole, requireAdmin } from '../../middleware/auth.middleware.js';
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

// User management routes (admin/manager/operator)
// WO-O4O-DASHBOARD-AUTH-API-NORMALIZE-V1: OPERATOR 추가 — Operator Dashboard 사용자 조회 허용
router.get('/', requireRole(['admin', 'super_admin', 'manager', 'operator']), adminUserController.getUsers);
router.get('/statistics', requireRole(['admin', 'super_admin', 'manager', 'operator']), adminUserController.getUserStatistics);
router.get('/:id', requireRole(['admin', 'super_admin', 'manager', 'operator']), adminUserController.getUser);

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

// User updates (admin/manager/operator)
router.put('/:id',
  requireRole(['admin', 'super_admin', 'manager', 'operator']),
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

// Update user status (admin/manager/operator)
router.patch('/:id/status',
  requireRole(['admin', 'super_admin', 'manager', 'operator']),
  [
    body('status').isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.updateUserStatus
);

// User deletion (admin only)
router.delete('/:id', requireAdmin, adminUserController.deleteUser);

export default router;