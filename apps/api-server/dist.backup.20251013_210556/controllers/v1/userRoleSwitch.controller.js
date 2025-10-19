"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleSwitchController = void 0;
const connection_1 = require("../../database/connection");
const User_1 = require("../../entities/User");
const Role_1 = require("../../entities/Role");
const UserActivityLog_1 = require("../../entities/UserActivityLog");
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../../utils/logger"));
class UserRoleSwitchController {
    /**
     * Switch active role for current user
     * PATCH /api/users/me/active-role
     */
    static async switchActiveRole(req, res) {
        var _a, _b;
        try {
            const currentUser = req.user;
            const { roleId } = req.body;
            // Validation: roleId is required
            if (!roleId) {
                res.status(400).json({
                    success: false,
                    message: 'roleId is required'
                });
                return;
            }
            // Validation: roleId must be a valid UUID
            if (!(0, uuid_1.validate)(roleId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid roleId format'
                });
                return;
            }
            // Get user with roles
            const user = await UserRoleSwitchController.userRepository.findOne({
                where: { id: currentUser.id },
                relations: ['dbRoles', 'activeRole']
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            // Check if role exists
            const role = await UserRoleSwitchController.roleRepository.findOne({
                where: { id: roleId, isActive: true },
                relations: ['permissions']
            });
            if (!role) {
                res.status(404).json({
                    success: false,
                    message: 'Role not found or inactive'
                });
                return;
            }
            // Check if user has this role
            if (!user.canSwitchToRole(roleId)) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to switch to this role',
                    availableRoles: ((_a = user.dbRoles) === null || _a === void 0 ? void 0 : _a.map(r => ({
                        id: r.id,
                        name: r.name,
                        displayName: r.displayName
                    }))) || []
                });
                return;
            }
            // Update active role
            const previousRole = user.activeRole;
            user.activeRole = role;
            await UserRoleSwitchController.userRepository.save(user);
            // Log the role switch activity
            try {
                const activityLog = UserRoleSwitchController.activityRepository.create({
                    userId: user.id,
                    activityType: UserActivityLog_1.ActivityType.ROLE_CHANGE,
                    description: `Role switched from ${(previousRole === null || previousRole === void 0 ? void 0 : previousRole.displayName) || 'None'} to ${role.displayName}`,
                    performedByUserId: user.id,
                    metadata: {
                        previousRoleId: (previousRole === null || previousRole === void 0 ? void 0 : previousRole.id) || null,
                        previousRoleName: (previousRole === null || previousRole === void 0 ? void 0 : previousRole.name) || null,
                        newRoleId: role.id,
                        newRoleName: role.name,
                        switchedBy: 'self'
                    }
                });
                await UserRoleSwitchController.activityRepository.save(activityLog);
            }
            catch (logError) {
                // Log error but don't fail the request
                logger_1.default.error('Failed to log role switch activity:', logError);
            }
            // Return updated user data
            res.status(200).json({
                success: true,
                message: `Active role switched to ${role.displayName}`,
                data: {
                    userId: user.id,
                    activeRole: {
                        id: role.id,
                        name: role.name,
                        displayName: role.displayName,
                        permissions: role.getPermissionKeys()
                    },
                    availableRoles: ((_b = user.dbRoles) === null || _b === void 0 ? void 0 : _b.map(r => ({
                        id: r.id,
                        name: r.name,
                        displayName: r.displayName,
                        isActive: r.id === role.id
                    }))) || []
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error switching active role:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get current user's roles
     * GET /api/users/me/roles
     */
    static async getCurrentUserRoles(req, res) {
        var _a, _b;
        try {
            const currentUser = req.user;
            // Get user with roles
            const user = await UserRoleSwitchController.userRepository.findOne({
                where: { id: currentUser.id },
                relations: ['dbRoles', 'activeRole']
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            const activeRole = user.getActiveRole();
            res.status(200).json({
                success: true,
                data: {
                    userId: user.id,
                    email: user.email,
                    activeRole: activeRole ? {
                        id: activeRole.id,
                        name: activeRole.name,
                        displayName: activeRole.displayName,
                        permissions: activeRole.getPermissionKeys()
                    } : null,
                    roles: ((_a = user.dbRoles) === null || _a === void 0 ? void 0 : _a.map(r => ({
                        id: r.id,
                        name: r.name,
                        displayName: r.displayName,
                        isActive: r.id === (activeRole === null || activeRole === void 0 ? void 0 : activeRole.id),
                        permissionCount: r.getPermissionKeys().length
                    }))) || [],
                    canSwitchRoles: user.hasMultipleRoles(),
                    totalRoles: ((_b = user.dbRoles) === null || _b === void 0 ? void 0 : _b.length) || 0
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching current user roles:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.UserRoleSwitchController = UserRoleSwitchController;
UserRoleSwitchController.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
UserRoleSwitchController.roleRepository = connection_1.AppDataSource.getRepository(Role_1.Role);
UserRoleSwitchController.activityRepository = connection_1.AppDataSource.getRepository(UserActivityLog_1.UserActivityLog);
//# sourceMappingURL=userRoleSwitch.controller.js.map