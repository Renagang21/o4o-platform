"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUserController = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../../entities/User");
const express_validator_1 = require("express-validator");
const bcrypt_1 = __importDefault(require("bcrypt"));
class AdminUserController {
    constructor() {
        // Get all users with pagination and filters
        this.getUsers = async (req, res) => {
            try {
                const { page = 1, limit = 20, search, role, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const queryBuilder = userRepo.createQueryBuilder('user');
                // Apply search filter
                if (search) {
                    queryBuilder.where('(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.company ILIKE :search)', { search: `%${search}%` });
                }
                // Apply role filter
                if (role && role !== 'all') {
                    queryBuilder.andWhere('user.role = :role', { role });
                }
                // Apply status filter
                if (status && status !== 'all') {
                    queryBuilder.andWhere('user.status = :status', { status });
                }
                // Apply sorting
                const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'];
                const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
                const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
                queryBuilder.orderBy(`user.${sortField}`, order);
                // Apply pagination
                const skip = (Number(page) - 1) * Number(limit);
                queryBuilder.skip(skip).take(Number(limit));
                const [users, totalCount] = await queryBuilder.getManyAndCount();
                // Remove password from response
                const sanitizedUsers = users.map(user => {
                    const { password, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                });
                const totalPages = Math.ceil(totalCount / Number(limit));
                res.json({
                    success: true,
                    users: sanitizedUsers,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: totalCount,
                        totalPages
                    }
                });
            }
            catch (error) {
                console.error('Error fetching users:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch users'
                });
            }
        };
        // Get single user by ID
        this.getUser = async (req, res) => {
            try {
                const { id } = req.params;
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const user = await userRepo.findOne({ where: { id } });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                // Remove password from response
                const { password, ...userWithoutPassword } = user;
                res.json({
                    success: true,
                    user: userWithoutPassword
                });
            }
            catch (error) {
                console.error('Error fetching user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user'
                });
            }
        };
        // Create new user
        this.createUser = async (req, res) => {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                    return;
                }
                const { email, password, firstName, lastName, name, role = User_1.UserRole.CUSTOMER, status = User_1.UserStatus.APPROVED, isActive = true } = req.body;
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                // Check if email already exists
                const existingUser = await userRepo.findOne({ where: { email } });
                if (existingUser) {
                    res.status(400).json({
                        success: false,
                        error: 'Email already exists'
                    });
                    return;
                }
                // Hash password
                const hashedPassword = await bcrypt_1.default.hash(password, 10);
                const newUser = userRepo.create({
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    name,
                    role,
                    status,
                    isActive,
                    roles: [role],
                    permissions: []
                });
                const savedUser = await userRepo.save(newUser);
                // Remove password from response
                const { password: _, ...userWithoutPassword } = savedUser;
                res.status(201).json({
                    success: true,
                    user: userWithoutPassword,
                    message: 'User created successfully'
                });
            }
            catch (error) {
                console.error('Error creating user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create user'
                });
            }
        };
        // Update user
        this.updateUser = async (req, res) => {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                    return;
                }
                const { id } = req.params;
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const user = await userRepo.findOne({ where: { id } });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                const { email, password, firstName, lastName, name, role, status, isActive } = req.body;
                // Check if email is being changed and already exists
                if (email && email !== user.email) {
                    const existingUser = await userRepo.findOne({ where: { email } });
                    if (existingUser) {
                        res.status(400).json({
                            success: false,
                            error: 'Email already exists'
                        });
                        return;
                    }
                }
                // Update fields
                if (email)
                    user.email = email;
                if (firstName)
                    user.firstName = firstName;
                if (lastName)
                    user.lastName = lastName;
                if (name)
                    user.name = name;
                if (role) {
                    user.role = role;
                    user.roles = [role];
                }
                if (status !== undefined)
                    user.status = status;
                if (isActive !== undefined)
                    user.isActive = isActive;
                // Update password if provided
                if (password) {
                    user.password = await bcrypt_1.default.hash(password, 10);
                }
                const updatedUser = await userRepo.save(user);
                // Remove password from response
                const { password: _, ...userWithoutPassword } = updatedUser;
                res.json({
                    success: true,
                    user: userWithoutPassword,
                    message: 'User updated successfully'
                });
            }
            catch (error) {
                console.error('Error updating user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user'
                });
            }
        };
        // Update user status
        this.updateUserStatus = async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const user = await userRepo.findOne({ where: { id } });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                user.status = status;
                await userRepo.save(user);
                res.json({
                    success: true,
                    message: `User status updated to ${status}`
                });
            }
            catch (error) {
                console.error('Error updating user status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user status'
                });
            }
        };
        // Delete user
        this.deleteUser = async (req, res) => {
            try {
                const { id } = req.params;
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const user = await userRepo.findOne({ where: { id } });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                await userRepo.remove(user);
                res.json({
                    success: true,
                    message: 'User deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete user'
                });
            }
        };
        // Get user statistics
        this.getUserStatistics = async (req, res) => {
            try {
                const userRepo = (0, typeorm_1.getRepository)(User_1.User);
                const [totalUsers, activeUsers, usersByRole, usersByStatus, recentUsers] = await Promise.all([
                    userRepo.count(),
                    userRepo.count({ where: { isActive: true } }),
                    userRepo
                        .createQueryBuilder('user')
                        .select('user.role as role, COUNT(*) as count')
                        .groupBy('user.role')
                        .getRawMany(),
                    userRepo
                        .createQueryBuilder('user')
                        .select('user.status as status, COUNT(*) as count')
                        .groupBy('user.status')
                        .getRawMany(),
                    userRepo.find({
                        order: { createdAt: 'DESC' },
                        take: 10,
                        select: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt']
                    })
                ]);
                res.json({
                    success: true,
                    statistics: {
                        total: totalUsers,
                        active: activeUsers,
                        inactive: totalUsers - activeUsers,
                        byRole: usersByRole,
                        byStatus: usersByStatus,
                        recent: recentUsers
                    }
                });
            }
            catch (error) {
                console.error('Error fetching user statistics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user statistics'
                });
            }
        };
    }
}
exports.AdminUserController = AdminUserController;
//# sourceMappingURL=AdminUserController.js.map