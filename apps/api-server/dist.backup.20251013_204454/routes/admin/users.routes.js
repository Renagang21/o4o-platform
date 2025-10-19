"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminUserController_1 = require("../../controllers/admin/AdminUserController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const User_1 = require("../../entities/User");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const adminUserController = new AdminUserController_1.AdminUserController();
// All admin user routes require authentication
router.use(auth_middleware_1.authenticate);
// User management routes (admin/manager only)
router.get('/', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), adminUserController.getUsers);
router.get('/statistics', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), adminUserController.getUserStatistics);
router.get('/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), adminUserController.getUser);
// User creation (admin only)
router.post('/', permission_middleware_1.requireAdmin, [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('role').optional().isIn([
        'super_admin', 'admin', 'manager', 'moderator', 'vendor', 'vendor_manager',
        'seller', 'customer', 'business', 'partner', 'supplier', 'affiliate', 'beta_user'
    ]).withMessage('Invalid role'),
    (0, express_validator_1.body)('status').optional().isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
], adminUserController.createUser);
// User updates (admin/manager only)
router.put('/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), [
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('role').optional().isIn([
        'super_admin', 'admin', 'manager', 'moderator', 'vendor', 'vendor_manager',
        'seller', 'customer', 'business', 'partner', 'supplier', 'affiliate', 'beta_user'
    ]).withMessage('Invalid role'),
    (0, express_validator_1.body)('status').optional().isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
], adminUserController.updateUser);
// Update user status (admin/manager only)
router.patch('/:id/status', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), [
    (0, express_validator_1.body)('status').isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
], adminUserController.updateUserStatus);
// User deletion (admin only)
router.delete('/:id', permission_middleware_1.requireAdmin, adminUserController.deleteUser);
exports.default = router;
//# sourceMappingURL=users.routes.js.map