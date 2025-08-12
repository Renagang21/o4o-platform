"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementController = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const ApprovalLog_1 = require("../entities/ApprovalLog");
const connection_1 = require("../database/connection");
const json2csv_1 = require("json2csv");
class UserManagementController {
    constructor() {
        // Get all users with filters
        this.getUsers = async (req, res) => {
            try {
                const { search, role, status, dateFrom, dateTo, page = 1, limit = 20, sortBy, sortOrder } = req.query;
                // Return mock data if database is not initialized
                if (!connection_1.AppDataSource.isInitialized) {
                    const mockUsers = [
                        {
                            id: '1',
                            name: 'Admin User',
                            email: 'admin@neture.co.kr',
                            firstName: 'Admin',
                            lastName: 'User',
                            role: 'administrator',
                            avatar: null,
                            posts: 42,
                            status: 'active',
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            id: '2',
                            name: 'Editor Kim',
                            email: 'editor@neture.co.kr',
                            firstName: 'Editor',
                            lastName: 'Kim',
                            role: 'editor',
                            avatar: null,
                            posts: 15,
                            status: 'active',
                            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                            lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            id: '3',
                            name: 'Author Lee',
                            email: 'author@neture.co.kr',
                            firstName: 'Author',
                            lastName: 'Lee',
                            role: 'author',
                            avatar: null,
                            posts: 8,
                            status: 'active',
                            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                            lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            id: '4',
                            name: 'Contributor Park',
                            email: 'contributor@neture.co.kr',
                            firstName: 'Contributor',
                            lastName: 'Park',
                            role: 'contributor',
                            avatar: null,
                            posts: 3,
                            status: 'active',
                            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                            lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            id: '5',
                            name: 'Subscriber Choi',
                            email: 'subscriber@neture.co.kr',
                            firstName: 'Subscriber',
                            lastName: 'Choi',
                            role: 'subscriber',
                            avatar: null,
                            posts: 0,
                            status: 'active',
                            createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
                            lastLogin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                            updatedAt: new Date().toISOString()
                        },
                        {
                            id: '6',
                            name: 'Pending User',
                            email: 'pending@neture.co.kr',
                            firstName: 'Pending',
                            lastName: 'User',
                            role: 'subscriber',
                            avatar: null,
                            posts: 0,
                            status: 'pending',
                            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                            lastLogin: null,
                            updatedAt: new Date().toISOString()
                        }
                    ];
                    // Apply filters
                    let filteredUsers = [...mockUsers];
                    if (role && role !== 'all') {
                        filteredUsers = filteredUsers.filter(user => user.role === role);
                    }
                    if (search) {
                        const searchLower = String(search).toLowerCase();
                        filteredUsers = filteredUsers.filter(user => user.name.toLowerCase().includes(searchLower) ||
                            user.email.toLowerCase().includes(searchLower));
                    }
                    if (status) {
                        filteredUsers = filteredUsers.filter(user => user.status === status);
                    }
                    res.json({
                        success: true,
                        data: {
                            users: filteredUsers,
                            pagination: {
                                total: filteredUsers.length,
                                page: Number(page),
                                limit: Number(limit),
                                totalPages: Math.ceil(filteredUsers.length / Number(limit))
                            }
                        }
                    });
                    return;
                }
                const filters = {
                    search: search,
                    role: role ? (Array.isArray(role) ? role : [role]) : undefined,
                    status: status ? (Array.isArray(status) ? status : [status]) : undefined,
                    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
                    dateTo: dateTo ? new Date(dateTo) : undefined
                };
                const pagination = {
                    page: Number(page),
                    limit: Number(limit),
                    sortBy: sortBy,
                    sortOrder: sortOrder
                };
                const { users, total } = await this.userRepository.findWithFilters(filters, pagination);
                res.json({
                    success: true,
                    data: {
                        users: users.map((user) => user.toPublicData()),
                        pagination: {
                            total,
                            page: pagination.page,
                            limit: pagination.limit,
                            totalPages: Math.ceil(total / pagination.limit)
                        }
                    }
                });
            }
            catch (error) {
                console.error('Error getting users:', error);
                // Return empty list instead of error for better UX
                res.json({
                    success: true,
                    data: {
                        users: [],
                        pagination: {
                            total: 0,
                            page: 1,
                            limit: 20,
                            totalPages: 0
                        }
                    }
                });
            }
        };
        // Get user statistics
        this.getUserStatistics = async (req, res) => {
            try {
                const statistics = await this.userRepository.getUserStatistics();
                res.json({
                    success: true,
                    data: statistics
                });
            }
            catch (error) {
                console.error('Error getting user statistics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get user statistics'
                });
            }
        };
        // Get pending approval users
        this.getPendingUsers = async (req, res) => {
            try {
                const { page = 1, limit = 20 } = req.query;
                const pagination = {
                    page: Number(page),
                    limit: Number(limit)
                };
                const { users, total } = await this.userRepository.findPendingApproval(pagination);
                res.json({
                    success: true,
                    data: {
                        users: users.map((user) => user.toPublicData()),
                        pagination: {
                            total,
                            page: pagination.page,
                            limit: pagination.limit,
                            totalPages: Math.ceil(total / pagination.limit)
                        }
                    }
                });
            }
            catch (error) {
                console.error('Error getting pending users:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get pending users'
                });
            }
        };
        // Get single user
        this.getUser = async (req, res) => {
            try {
                const { id } = req.params;
                const user = await this.userRepository.findOne({
                    where: { id },
                    relations: ['approvalLogs', 'approvalLogs.admin']
                });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: user.toPublicData()
                });
            }
            catch (error) {
                console.error('Error getting user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get user'
                });
            }
        };
        // Create new user
        this.createUser = async (req, res) => {
            try {
                const { email, password, firstName, lastName, role, roles, status } = req.body;
                // Check if user already exists
                const existingUser = await this.userRepository.findOne({ where: { email } });
                if (existingUser) {
                    res.status(400).json({
                        success: false,
                        error: 'User with this email already exists'
                    });
                    return;
                }
                // Create new user
                const user = this.userRepository.create({
                    email,
                    password,
                    firstName,
                    lastName,
                    role: role || 'customer',
                    roles: roles || [role || 'customer'],
                    status: status || 'pending'
                });
                const savedUser = await this.userRepository.save(user);
                res.status(201).json({
                    success: true,
                    data: savedUser.toPublicData()
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
                const { id } = req.params;
                const { email, firstName, lastName, status, roles } = req.body;
                const user = await this.userRepository.findOne({ where: { id } });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                // Update user fields
                if (email)
                    user.email = email;
                if (firstName !== undefined)
                    user.firstName = firstName;
                if (lastName !== undefined)
                    user.lastName = lastName;
                if (status)
                    user.status = status;
                if (roles) {
                    user.roles = roles;
                    user.role = roles[0] || user.role;
                }
                const updatedUser = await this.userRepository.save(user);
                res.json({
                    success: true,
                    data: updatedUser.toPublicData()
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
        // Delete user (soft delete)
        this.deleteUser = async (req, res) => {
            try {
                const { id } = req.params;
                const user = await this.userRepository.findOne({ where: { id } });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                    return;
                }
                await this.userRepository.softDeleteUser(id);
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
        // Approve user
        this.approveUser = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { notes } = req.body;
                const adminId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId);
                if (!adminId) {
                    res.status(401).json({
                        success: false,
                        error: 'Admin ID not found'
                    });
                    return;
                }
                const user = await this.userRepository.approveUser(id, adminId, notes);
                res.json({
                    success: true,
                    data: user.toPublicData()
                });
            }
            catch (error) {
                console.error('Error approving user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to approve user'
                });
            }
        };
        // Reject user
        this.rejectUser = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { notes } = req.body;
                const adminId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId);
                if (!adminId) {
                    res.status(401).json({
                        success: false,
                        error: 'Admin ID not found'
                    });
                    return;
                }
                const user = await this.userRepository.rejectUser(id, adminId, notes);
                res.json({
                    success: true,
                    data: user.toPublicData()
                });
            }
            catch (error) {
                console.error('Error rejecting user:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to reject user'
                });
            }
        };
        // Bulk approve users
        this.bulkApprove = async (req, res) => {
            var _a, _b;
            try {
                const { userIds, notes } = req.body;
                const adminId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId);
                if (!adminId) {
                    res.status(401).json({
                        success: false,
                        error: 'Admin ID not found'
                    });
                    return;
                }
                const count = await this.userRepository.bulkApprove(userIds, adminId, notes);
                res.json({
                    success: true,
                    data: {
                        approvedCount: count
                    }
                });
            }
            catch (error) {
                console.error('Error bulk approving users:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to bulk approve users'
                });
            }
        };
        // Bulk reject users
        this.bulkReject = async (req, res) => {
            var _a, _b;
            try {
                const { userIds, notes } = req.body;
                const adminId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId);
                if (!adminId) {
                    res.status(401).json({
                        success: false,
                        error: 'Admin ID not found'
                    });
                    return;
                }
                const count = await this.userRepository.bulkReject(userIds, adminId, notes);
                res.json({
                    success: true,
                    data: {
                        rejectedCount: count
                    }
                });
            }
            catch (error) {
                console.error('Error bulk rejecting users:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to bulk reject users'
                });
            }
        };
        // Update user roles
        this.updateUserRoles = async (req, res) => {
            try {
                const { id } = req.params;
                const { roles } = req.body;
                const user = await this.userRepository.updateUserRoles(id, roles);
                res.json({
                    success: true,
                    data: user.toPublicData()
                });
            }
            catch (error) {
                console.error('Error updating user roles:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user roles'
                });
            }
        };
        // Get user approval history
        this.getUserApprovalHistory = async (req, res) => {
            try {
                const { id } = req.params;
                const approvalLogRepo = connection_1.AppDataSource.getRepository(ApprovalLog_1.ApprovalLog);
                const logs = await approvalLogRepo.find({
                    where: { user_id: id },
                    relations: ['admin'],
                    order: { created_at: 'DESC' }
                });
                res.json({
                    success: true,
                    data: logs
                });
            }
            catch (error) {
                console.error('Error getting approval history:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get approval history'
                });
            }
        };
        // Export users to CSV
        this.exportUsers = async (req, res) => {
            try {
                const { search, role, status } = req.query;
                const filters = {
                    search: search,
                    role: role ? (Array.isArray(role) ? role : [role]) : undefined,
                    status: status ? (Array.isArray(status) ? status : [status]) : undefined
                };
                const { users } = await this.userRepository.findWithFilters(filters);
                // Prepare data for CSV
                const csvData = users.map((user) => {
                    var _a;
                    return ({
                        ID: user.id,
                        Email: user.email,
                        'First Name': user.firstName || '',
                        'Last Name': user.lastName || '',
                        'Full Name': user.fullName,
                        Role: user.role,
                        Roles: user.roles.join(', '),
                        Status: user.status,
                        'Email Verified': user.isEmailVerified ? 'Yes' : 'No',
                        'Created At': user.createdAt.toISOString(),
                        'Last Login': ((_a = user.lastLoginAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || 'Never'
                    });
                });
                // Convert to CSV
                const parser = new json2csv_1.Parser();
                const csv = parser.parse(csvData);
                // Set response headers
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
                res.send(csv);
            }
            catch (error) {
                console.error('Error exporting users:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to export users'
                });
            }
        };
        this.userRepository = new UserRepository_1.UserRepository();
    }
}
exports.UserManagementController = UserManagementController;
//# sourceMappingURL=UserManagementController.js.map