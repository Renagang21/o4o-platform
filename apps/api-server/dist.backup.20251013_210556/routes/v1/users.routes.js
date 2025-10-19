"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userActivity_routes_1 = __importDefault(require("./userActivity.routes"));
const userRole_routes_1 = __importDefault(require("./userRole.routes"));
const userRoleSwitch_routes_1 = __importDefault(require("./userRoleSwitch.routes"));
const userStatistics_routes_1 = __importDefault(require("./userStatistics.routes"));
const businessInfo_routes_1 = __importDefault(require("./businessInfo.routes"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const connection_1 = require("../../database/connection");
const User_1 = require("../../entities/User");
const logger_1 = __importDefault(require("../../utils/logger"));
const router = (0, express_1.Router)();
// Mount sub-routers FIRST (before generic /:id routes) to ensure specific routes like /statistics match correctly
router.use('/', userActivity_routes_1.default);
router.use('/', userRole_routes_1.default);
router.use('/', userRoleSwitch_routes_1.default);
router.use('/', userStatistics_routes_1.default);
router.use('/', businessInfo_routes_1.default);
// Basic user list endpoint
router.get('/', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search;
        const status = req.query.status;
        const role = req.query.role;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const queryBuilder = userRepository.createQueryBuilder('user');
        // Apply filters
        if (search) {
            queryBuilder.andWhere('(user.email ILIKE :search OR user.name ILIKE :search)', { search: `%${search}%` });
        }
        if (status) {
            queryBuilder.andWhere('user.status = :status', { status });
        }
        if (role) {
            queryBuilder.andWhere('user.role = :role', { role });
        }
        // Get total count
        const total = await queryBuilder.getCount();
        // Get paginated results
        const users = await queryBuilder
            .orderBy('user.createdAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getMany();
        // Transform users to match frontend expectations
        const transformedUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            provider: user.provider,
            businessInfo: user.businessInfo,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt
        }));
        res.json({
            success: true,
            data: {
                users: transformedUsers,
                pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    count: limit,
                    totalItems: total
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get single user
router.get('/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});
// Delete user
router.delete('/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const result = await userRepository.delete({ id: req.params.id });
        if (result.affected === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});
// Create new user
router.post('/', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Check if user already exists
        const existingUser = await userRepository.findOne({
            where: { email: req.body.email }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        // Create new user
        const newUser = userRepository.create({
            email: req.body.email,
            password: req.body.password, // Should be hashed in the entity
            name: req.body.firstName && req.body.lastName
                ? `${req.body.firstName} ${req.body.lastName}`
                : req.body.firstName || req.body.lastName || req.body.email.split('@')[0],
            role: req.body.role || 'customer',
            status: req.body.status || 'active',
            provider: 'local'
        });
        const savedUser = await userRepository.save(newUser);
        // Remove password from response
        const { password, ...userWithoutPassword } = savedUser;
        res.status(201).json({
            success: true,
            data: userWithoutPassword
        });
    }
    catch (error) {
        logger_1.default.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update user (PUT for full update)
router.put('/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Update allowed fields
        if (req.body.email)
            user.email = req.body.email;
        if (req.body.password)
            user.password = req.body.password; // Will be hashed in entity
        if (req.body.firstName || req.body.lastName) {
            user.name = req.body.firstName && req.body.lastName
                ? `${req.body.firstName} ${req.body.lastName}`
                : req.body.firstName || req.body.lastName || user.name;
        }
        if (req.body.role)
            user.role = req.body.role;
        if (req.body.status)
            user.status = req.body.status;
        const updatedUser = await userRepository.save(user);
        // Remove password from response
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
            success: true,
            data: userWithoutPassword
        });
    }
    catch (error) {
        logger_1.default.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});
// Update user (PATCH for partial update)
router.patch('/:id', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Update allowed fields
        if (req.body.role)
            user.role = req.body.role;
        if (req.body.status)
            user.status = req.body.status;
        if (req.body.name)
            user.name = req.body.name;
        const updatedUser = await userRepository.save(user);
        res.json({
            success: true,
            data: updatedUser
        });
    }
    catch (error) {
        logger_1.default.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map