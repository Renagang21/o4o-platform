"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminSupplierController_1 = require("../../controllers/admin/AdminSupplierController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const User_1 = require("../../entities/User");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const adminSupplierController = new AdminSupplierController_1.AdminSupplierController();
// All admin supplier routes require authentication
router.use(auth_middleware_1.authenticate);
// Supplier management routes (admin/manager only)
router.get('/', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), adminSupplierController.getSuppliers);
router.get('/statistics', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), adminSupplierController.getSupplierStatistics);
router.get('/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), adminSupplierController.getSupplier);
// Supplier creation (admin only)
router.post('/', permission_middleware_1.requireAdmin, [
    (0, express_validator_1.body)('businessName').notEmpty().withMessage('Business name is required'),
    (0, express_validator_1.body)('businessNumber').notEmpty().withMessage('Business number is required'),
    (0, express_validator_1.body)('contactPerson').notEmpty().withMessage('Contact person is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone').notEmpty().withMessage('Phone number is required'),
    (0, express_validator_1.body)('address').notEmpty().withMessage('Address is required'),
    (0, express_validator_1.body)('category').notEmpty().withMessage('Category is required'),
    (0, express_validator_1.body)('commissionRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0-100'),
    (0, express_validator_1.body)('minimumOrder').optional().isFloat({ min: 0 }).withMessage('Minimum order must be non-negative'),
    (0, express_validator_1.body)('maxProcessingDays').optional().isInt({ min: 1, max: 30 }).withMessage('Processing days must be between 1-30')
], adminSupplierController.createSupplier);
// Supplier updates (admin/manager only)
router.put('/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), [
    (0, express_validator_1.body)('businessName').optional().notEmpty().withMessage('Business name cannot be empty'),
    (0, express_validator_1.body)('businessNumber').optional().notEmpty().withMessage('Business number cannot be empty'),
    (0, express_validator_1.body)('contactPerson').optional().notEmpty().withMessage('Contact person cannot be empty'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
    (0, express_validator_1.body)('address').optional().notEmpty().withMessage('Address cannot be empty'),
    (0, express_validator_1.body)('category').optional().notEmpty().withMessage('Category cannot be empty'),
    (0, express_validator_1.body)('commissionRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0-100'),
    (0, express_validator_1.body)('minimumOrder').optional().isFloat({ min: 0 }).withMessage('Minimum order must be non-negative'),
    (0, express_validator_1.body)('maxProcessingDays').optional().isInt({ min: 1, max: 30 }).withMessage('Processing days must be between 1-30')
], adminSupplierController.updateSupplier);
// Update supplier status (admin/manager only)
router.patch('/:id/status', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), [
    (0, express_validator_1.body)('isActive').isBoolean().withMessage('isActive must be a boolean')
], adminSupplierController.updateSupplierStatus);
// Approve supplier (admin only)
router.patch('/:id/approve', permission_middleware_1.requireAdmin, adminSupplierController.approveSupplier);
// Supplier deletion (admin only)
router.delete('/:id', permission_middleware_1.requireAdmin, adminSupplierController.deleteSupplier);
exports.default = router;
//# sourceMappingURL=suppliers.routes.js.map