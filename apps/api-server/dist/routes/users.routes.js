"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserManagementController_1 = require("../controllers/UserManagementController");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../types/auth");
const express_validator_1 = require("express-validator");
const express_validator_2 = require("express-validator");
const router = (0, express_1.Router)();
const userController = new UserManagementController_1.UserManagementController();
// Validation rules
const createUserValidation = [
    (0, express_validator_2.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_2.body)('password').isLength({ min: 6 }),
    (0, express_validator_2.body)('firstName').optional().trim().notEmpty(),
    (0, express_validator_2.body)('lastName').optional().trim().notEmpty(),
    (0, express_validator_2.body)('role').optional().isIn(Object.values(auth_2.UserRole)),
    (0, express_validator_2.body)('roles').optional().isArray(),
    (0, express_validator_2.body)('roles.*').optional().isIn(Object.values(auth_2.UserRole))
];
const updateUserValidation = [
    (0, express_validator_2.body)('email').optional().isEmail().normalizeEmail(),
    (0, express_validator_2.body)('firstName').optional().trim().notEmpty(),
    (0, express_validator_2.body)('lastName').optional().trim().notEmpty(),
    (0, express_validator_2.body)('status').optional().isIn(['active', 'pending', 'approved', 'rejected']),
    (0, express_validator_2.body)('roles').optional().isArray(),
    (0, express_validator_2.body)('roles.*').optional().isIn(Object.values(auth_2.UserRole))
];
const paginationValidation = [
    (0, express_validator_2.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_2.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_2.query)('sortBy').optional().isIn(['createdAt', 'email', 'firstName', 'lastName']),
    (0, express_validator_2.query)('sortOrder').optional().isIn(['ASC', 'DESC'])
];
// Public routes (none for user management)
// Protected routes - require authentication
router.use(auth_1.authenticateToken);
// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
// Admin only routes
router.use(auth_1.requireAdmin);
// Get all users with filters
router.get('/', [
    ...paginationValidation,
    (0, express_validator_2.query)('search').optional().trim(),
    (0, express_validator_2.query)('role').optional(),
    (0, express_validator_2.query)('status').optional(),
    (0, express_validator_2.query)('dateFrom').optional().isISO8601(),
    (0, express_validator_2.query)('dateTo').optional().isISO8601()
], validateRequest, userController.getUsers);
// Get user statistics
router.get('/statistics', userController.getUserStatistics);
// Get pending approval users
router.get('/pending', paginationValidation, validateRequest, userController.getPendingUsers);
// Handle /new path explicitly (return empty data for new user form)
router.get('/new', (req, res) => {
    res.json({
        success: true,
        data: {
            user: null,
            roles: ['admin', 'editor', 'author', 'customer', 'vendor']
        }
    });
});
// Get single user
router.get('/:id', (0, express_validator_2.param)('id').isUUID(), validateRequest, userController.getUser);
// Create new user
router.post('/', createUserValidation, validateRequest, userController.createUser);
// Update user
router.put('/:id', [
    (0, express_validator_2.param)('id').isUUID(),
    ...updateUserValidation
], validateRequest, userController.updateUser);
// Delete user (soft delete)
router.delete('/:id', (0, express_validator_2.param)('id').isUUID(), validateRequest, userController.deleteUser);
// Approve user
router.post('/:id/approve', [
    (0, express_validator_2.param)('id').isUUID(),
    (0, express_validator_2.body)('notes').optional().trim()
], validateRequest, userController.approveUser);
// Reject user
router.post('/:id/reject', [
    (0, express_validator_2.param)('id').isUUID(),
    (0, express_validator_2.body)('notes').optional().trim()
], validateRequest, userController.rejectUser);
// Bulk approve users
router.post('/bulk-approve', [
    (0, express_validator_2.body)('userIds').isArray().notEmpty(),
    (0, express_validator_2.body)('userIds.*').isUUID(),
    (0, express_validator_2.body)('notes').optional().trim()
], validateRequest, userController.bulkApprove);
// Bulk reject users
router.post('/bulk-reject', [
    (0, express_validator_2.body)('userIds').isArray().notEmpty(),
    (0, express_validator_2.body)('userIds.*').isUUID(),
    (0, express_validator_2.body)('notes').optional().trim()
], validateRequest, userController.bulkReject);
// Update user roles
router.put('/:id/roles', [
    (0, express_validator_2.param)('id').isUUID(),
    (0, express_validator_2.body)('roles').isArray().notEmpty(),
    (0, express_validator_2.body)('roles.*').isIn(Object.values(auth_2.UserRole))
], validateRequest, userController.updateUserRoles);
// Get user approval history
router.get('/:id/approval-history', (0, express_validator_2.param)('id').isUUID(), validateRequest, userController.getUserApprovalHistory);
// Export users to CSV
router.get('/export/csv', [
    ...paginationValidation,
    (0, express_validator_2.query)('search').optional().trim(),
    (0, express_validator_2.query)('role').optional(),
    (0, express_validator_2.query)('status').optional()
], validateRequest, userController.exportUsers);
exports.default = router;
//# sourceMappingURL=users.routes.js.map