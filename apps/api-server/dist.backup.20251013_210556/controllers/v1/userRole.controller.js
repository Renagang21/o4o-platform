"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = exports.UserRoleController = exports.ROLE_PERMISSIONS_LEGACY = exports.PERMISSIONS_LEGACY = void 0;
const connection_1 = require("../../database/connection");
const User_1 = require("../../entities/User");
const Role_1 = require("../../entities/Role");
const Permission_1 = require("../../entities/Permission");
const UserActivityLog_1 = require("../../entities/UserActivityLog");
const class_validator_1 = require("class-validator");
// Legacy hardcoded permissions (kept as fallback during migration)
exports.PERMISSIONS_LEGACY = {
    // User management
    'users.view': 'View users',
    'users.create': 'Create users',
    'users.edit': 'Edit users',
    'users.delete': 'Delete users',
    'users.suspend': 'Suspend/unsuspend users',
    'users.approve': 'Approve users',
    // Content management
    'content.view': 'View content',
    'content.create': 'Create content',
    'content.edit': 'Edit content',
    'content.delete': 'Delete content',
    'content.publish': 'Publish content',
    'content.moderate': 'Moderate content',
    // System administration
    'admin.settings': 'Manage system settings',
    'admin.analytics': 'View analytics',
    'admin.logs': 'View system logs',
    'admin.backup': 'Manage backups',
    // ACF and CPT
    'acf.manage': 'Manage custom fields',
    'cpt.manage': 'Manage custom post types',
    'shortcodes.manage': 'Manage shortcodes',
    // API access
    'api.access': 'Access API',
    'api.admin': 'Admin API access'
};
// Legacy role permissions mapping (kept as fallback during migration)
exports.ROLE_PERMISSIONS_LEGACY = {
    [User_1.UserRole.SUPER_ADMIN]: Object.keys(exports.PERMISSIONS_LEGACY),
    [User_1.UserRole.ADMIN]: Object.keys(exports.PERMISSIONS_LEGACY),
    [User_1.UserRole.MODERATOR]: [
        'users.view', 'users.suspend', 'users.approve',
        'content.view', 'content.edit', 'content.moderate', 'content.publish',
        'admin.analytics', 'admin.logs',
        'api.access'
    ],
    [User_1.UserRole.MANAGER]: [
        'users.view',
        'content.view', 'content.create', 'content.edit', 'content.publish',
        'acf.manage', 'cpt.manage', 'shortcodes.manage',
        'api.access'
    ],
    [User_1.UserRole.VENDOR]: [
        'content.view', 'content.create', 'content.edit',
        'api.access'
    ],
    [User_1.UserRole.VENDOR_MANAGER]: [
        'users.view', 'users.create', 'users.edit',
        'content.view', 'content.create', 'content.edit', 'content.publish',
        'admin.analytics',
        'api.access'
    ],
    [User_1.UserRole.SELLER]: [
        'content.view', 'content.create',
        'api.access'
    ],
    [User_1.UserRole.CUSTOMER]: [
        'content.view',
        'api.access'
    ],
    [User_1.UserRole.BUSINESS]: [
        'content.view', 'content.create',
        'api.access'
    ],
    [User_1.UserRole.PARTNER]: [
        'content.view', 'content.create',
        'api.access'
    ],
    [User_1.UserRole.BETA_USER]: [
        'content.view', 'content.create',
        'api.access'
    ],
    [User_1.UserRole.SUPPLIER]: [
        'content.view', 'content.create',
        'api.access'
    ],
    [User_1.UserRole.AFFILIATE]: [
        'content.view',
        'api.access'
    ]
};
// Simple in-memory cache for permissions (5 minutes TTL)
const permissionsCache = {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5 minutes
};
const rolesCache = {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5 minutes
};
class UserRoleController {
    /**
     * Get all permissions from database (with caching)
     */
    static async getAllPermissions() {
        const now = Date.now();
        if (permissionsCache.data && (now - permissionsCache.timestamp < permissionsCache.ttl)) {
            return permissionsCache.data;
        }
        try {
            const permissions = await UserRoleController.permissionRepository.find({
                where: { isActive: true }
            });
            permissionsCache.data = permissions;
            permissionsCache.timestamp = now;
            return permissions;
        }
        catch (error) {
            console.error('Failed to fetch permissions from database, using legacy fallback', error);
            // Fallback to legacy permissions
            return Object.entries(exports.PERMISSIONS_LEGACY).map(([key, description]) => {
                const [category] = key.split('.');
                return { key, description, category, isActive: true };
            });
        }
    }
    /**
     * Get all roles from database (with caching)
     */
    static async getAllRoles() {
        const now = Date.now();
        if (rolesCache.data && (now - rolesCache.timestamp < rolesCache.ttl)) {
            return rolesCache.data;
        }
        try {
            const roles = await UserRoleController.roleRepository.find({
                where: { isActive: true },
                relations: ['permissions']
            });
            rolesCache.data = roles;
            rolesCache.timestamp = now;
            return roles;
        }
        catch (error) {
            console.error('Failed to fetch roles from database, using legacy fallback', error);
            return [];
        }
    }
    /**
     * Get role by name from database
     */
    static async getRoleByName(name) {
        try {
            const role = await UserRoleController.roleRepository.findOne({
                where: { name, isActive: true },
                relations: ['permissions']
            });
            return role;
        }
        catch (error) {
            console.error(`Failed to fetch role ${name} from database`, error);
            return null;
        }
    }
    /**
     * Get role permissions (from DB or legacy fallback)
     */
    static async getRolePermissions(roleName) {
        // Try to get from database first
        const role = await UserRoleController.getRoleByName(roleName);
        if (role && role.permissions) {
            return role.getPermissionKeys();
        }
        // Fallback to legacy hardcoded permissions
        const legacyRole = roleName;
        if (exports.ROLE_PERMISSIONS_LEGACY[legacyRole]) {
            return exports.ROLE_PERMISSIONS_LEGACY[legacyRole];
        }
        return [];
    }
    static async getRoles(req, res) {
        try {
            const dbRoles = await UserRoleController.getAllRoles();
            if (dbRoles.length > 0) {
                // Use database roles
                const roles = dbRoles.map(role => ({
                    value: role.name,
                    label: role.displayName,
                    permissions: role.getPermissionKeys(),
                    permissionCount: role.getPermissionKeys().length,
                    isSystem: role.isSystem,
                    description: role.description
                }));
                res.status(200).json({
                    success: true,
                    data: roles
                });
            }
            else {
                // Fallback to legacy enum-based roles
                const roles = Object.values(User_1.UserRole).map(role => ({
                    value: role,
                    label: role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' '),
                    permissions: exports.ROLE_PERMISSIONS_LEGACY[role],
                    permissionCount: exports.ROLE_PERMISSIONS_LEGACY[role].length
                }));
                res.status(200).json({
                    success: true,
                    data: roles,
                    warning: 'Using legacy role definitions. Run database migrations and seed data.'
                });
            }
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async getUserRole(req, res) {
        try {
            const { id: userId } = req.params;
            const user = await UserRoleController.userRepository.findOne({
                where: { id: userId },
                select: ['id', 'email', 'firstName', 'lastName', 'role', 'status']
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            // Get permissions from database or fallback
            const permissions = await UserRoleController.getRolePermissions(user.role);
            const userRole = {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                permissions,
                roleLabel: user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')
            };
            res.status(200).json({
                success: true,
                data: userRole
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async updateUserRole(req, res) {
        try {
            const { id: userId } = req.params;
            const { role, reason } = req.body;
            const currentUser = req.user;
            if (!Object.values(User_1.UserRole).includes(role)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
                return;
            }
            const user = await UserRoleController.userRepository.findOne({
                where: { id: userId }
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            // Prevent users from elevating themselves to admin
            if (currentUser.id === userId && role === User_1.UserRole.ADMIN && user.role !== User_1.UserRole.ADMIN) {
                res.status(403).json({
                    success: false,
                    message: 'Cannot elevate your own role to admin'
                });
                return;
            }
            // Prevent demoting the last admin
            if (user.role === User_1.UserRole.ADMIN && role !== User_1.UserRole.ADMIN) {
                const adminCount = await UserRoleController.userRepository.count({
                    where: { role: User_1.UserRole.ADMIN }
                });
                if (adminCount <= 1) {
                    res.status(403).json({
                        success: false,
                        message: 'Cannot demote the last admin user'
                    });
                    return;
                }
            }
            const oldRole = user.role;
            user.role = role;
            const errors = await (0, class_validator_1.validate)(user);
            if (errors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.map(err => ({
                        property: err.property,
                        constraints: err.constraints
                    }))
                });
                return;
            }
            await UserRoleController.userRepository.save(user);
            // Log the role change activity
            const activityData = UserActivityLog_1.UserActivityLog.createRoleChangeActivity(userId, oldRole, role, currentUser.id, reason);
            const activity = UserRoleController.activityRepository.create(activityData);
            await UserRoleController.activityRepository.save(activity);
            // Get permissions from database or fallback
            const permissions = await UserRoleController.getRolePermissions(role);
            res.status(200).json({
                success: true,
                data: {
                    userId: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    oldRole,
                    newRole: role,
                    permissions,
                    updatedAt: new Date()
                },
                message: 'User role updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async getPermissions(req, res) {
        try {
            const { role } = req.query;
            // Get all permissions from database
            const allPermissions = await UserRoleController.getAllPermissions();
            let rolePermissions = [];
            if (role && typeof role === 'string') {
                rolePermissions = await UserRoleController.getRolePermissions(role);
            }
            const permissionsData = allPermissions.map(p => ({
                key: p.key,
                description: p.description,
                category: p.category,
                granted: rolePermissions.length > 0 ? rolePermissions.includes(p.key) : false
            }));
            // Group permissions by category
            const categories = [...new Set(allPermissions.map(p => p.category))];
            const groupedPermissions = {};
            categories.forEach(category => {
                groupedPermissions[category] = permissionsData.filter(p => p.category === category);
            });
            res.status(200).json({
                success: true,
                data: {
                    all: permissionsData,
                    grouped: groupedPermissions,
                    rolePermissions: rolePermissions
                }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async getUserPermissions(req, res) {
        try {
            const { id: userId } = req.params;
            const user = await UserRoleController.userRepository.findOne({
                where: { id: userId },
                select: ['id', 'role', 'email', 'firstName', 'lastName', 'name', 'status'],
                relations: ['dbRoles']
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            // Get all permissions (from DB roles + direct permissions)
            const userPermissions = user.getAllPermissions();
            // Get all available permissions
            const allPermissionsDb = await UserRoleController.getAllPermissions();
            const allPermissions = allPermissionsDb.map(p => ({
                key: p.key,
                description: p.description,
                category: p.category,
                granted: userPermissions.includes(p.key)
            }));
            // Group permissions by category
            const categories = [...new Set(allPermissionsDb.map(p => p.category))];
            const groupedPermissions = {};
            categories.forEach(category => {
                groupedPermissions[category] = allPermissions.filter(p => p.category === category);
            });
            res.status(200).json({
                success: true,
                data: {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    permissions: userPermissions, // Frontend expects string array of permission keys
                    permissionsDetailed: allPermissions, // Detailed permission info with descriptions
                    groupedPermissions,
                    totalPermissions: allPermissions.length,
                    grantedPermissions: userPermissions.length
                }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async checkUserPermission(req, res) {
        try {
            const { id: userId } = req.params;
            const { permission } = req.query;
            if (!permission || typeof permission !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Permission parameter is required'
                });
                return;
            }
            const user = await UserRoleController.userRepository.findOne({
                where: { id: userId },
                select: ['id', 'role'],
                relations: ['dbRoles']
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            const hasPermission = user.hasPermission(permission);
            res.status(200).json({
                success: true,
                data: {
                    userId: user.id,
                    role: user.role,
                    permission,
                    granted: hasPermission
                }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async getRoleStatistics(req, res) {
        var _a, _b;
        try {
            const dbRoles = await UserRoleController.getAllRoles();
            if (dbRoles.length > 0) {
                // Use database roles for statistics
                const roleStats = await Promise.all(dbRoles.map(async (dbRole) => {
                    const count = await UserRoleController.userRepository
                        .createQueryBuilder('user')
                        .leftJoin('user.dbRoles', 'role')
                        .where('role.name = :name', { name: dbRole.name })
                        .orWhere('user.role = :legacyRole', { legacyRole: dbRole.name })
                        .getCount();
                    return {
                        role: dbRole.name,
                        label: dbRole.displayName,
                        count,
                        permissions: dbRole.getPermissionKeys().length
                    };
                }));
                const totalUsers = await UserRoleController.userRepository.count();
                res.status(200).json({
                    success: true,
                    data: {
                        roleDistribution: roleStats,
                        totalUsers,
                        summary: {
                            admins: ((_a = roleStats.find(r => r.role === 'admin')) === null || _a === void 0 ? void 0 : _a.count) || 0,
                            activeUsers: roleStats.reduce((sum, r) => sum + r.count, 0),
                            pendingUsers: 0
                        }
                    }
                });
            }
            else {
                // Fallback to legacy enum-based statistics
                const roleStats = await Promise.all(Object.values(User_1.UserRole).map(async (role) => {
                    const count = await UserRoleController.userRepository.count({
                        where: { role }
                    });
                    return {
                        role,
                        label: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
                        count,
                        permissions: exports.ROLE_PERMISSIONS_LEGACY[role].length
                    };
                }));
                const totalUsers = await UserRoleController.userRepository.count();
                res.status(200).json({
                    success: true,
                    data: {
                        roleDistribution: roleStats,
                        totalUsers,
                        summary: {
                            admins: ((_b = roleStats.find(r => r.role === User_1.UserRole.ADMIN)) === null || _b === void 0 ? void 0 : _b.count) || 0,
                            activeUsers: roleStats.reduce((sum, r) => sum + r.count, 0),
                            pendingUsers: 0
                        }
                    },
                    warning: 'Using legacy role definitions. Run database migrations and seed data.'
                });
            }
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Clear permissions and roles cache
     * Useful after updating roles/permissions in database
     */
    static clearCache() {
        permissionsCache.data = null;
        permissionsCache.timestamp = 0;
        rolesCache.data = null;
        rolesCache.timestamp = 0;
    }
}
exports.UserRoleController = UserRoleController;
UserRoleController.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
UserRoleController.roleRepository = connection_1.AppDataSource.getRepository(Role_1.Role);
UserRoleController.permissionRepository = connection_1.AppDataSource.getRepository(Permission_1.Permission);
UserRoleController.activityRepository = connection_1.AppDataSource.getRepository(UserActivityLog_1.UserActivityLog);
// Export legacy constants for backward compatibility
exports.PERMISSIONS = exports.PERMISSIONS_LEGACY;
exports.ROLE_PERMISSIONS = exports.ROLE_PERMISSIONS_LEGACY;
//# sourceMappingURL=userRole.controller.js.map