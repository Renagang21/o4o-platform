import { Request, Response } from 'express';
import { UserRole } from '../../entities/User';
export declare const PERMISSIONS_LEGACY: {
    readonly 'users.view': "View users";
    readonly 'users.create': "Create users";
    readonly 'users.edit': "Edit users";
    readonly 'users.delete': "Delete users";
    readonly 'users.suspend': "Suspend/unsuspend users";
    readonly 'users.approve': "Approve users";
    readonly 'content.view': "View content";
    readonly 'content.create': "Create content";
    readonly 'content.edit': "Edit content";
    readonly 'content.delete': "Delete content";
    readonly 'content.publish': "Publish content";
    readonly 'content.moderate': "Moderate content";
    readonly 'admin.settings': "Manage system settings";
    readonly 'admin.analytics': "View analytics";
    readonly 'admin.logs': "View system logs";
    readonly 'admin.backup': "Manage backups";
    readonly 'acf.manage': "Manage custom fields";
    readonly 'cpt.manage': "Manage custom post types";
    readonly 'shortcodes.manage': "Manage shortcodes";
    readonly 'api.access': "Access API";
    readonly 'api.admin': "Admin API access";
};
export declare const ROLE_PERMISSIONS_LEGACY: Record<UserRole, string[]>;
export declare class UserRoleController {
    private static userRepository;
    private static roleRepository;
    private static permissionRepository;
    private static activityRepository;
    /**
     * Get all permissions from database (with caching)
     */
    private static getAllPermissions;
    /**
     * Get all roles from database (with caching)
     */
    private static getAllRoles;
    /**
     * Get role by name from database
     */
    private static getRoleByName;
    /**
     * Get role permissions (from DB or legacy fallback)
     */
    private static getRolePermissions;
    static getRoles(req: Request, res: Response): Promise<void>;
    static getUserRole(req: Request, res: Response): Promise<void>;
    static updateUserRole(req: Request, res: Response): Promise<void>;
    static getPermissions(req: Request, res: Response): Promise<void>;
    static getUserPermissions(req: Request, res: Response): Promise<void>;
    static checkUserPermission(req: Request, res: Response): Promise<void>;
    static getRoleStatistics(req: Request, res: Response): Promise<void>;
    /**
     * Clear permissions and roles cache
     * Useful after updating roles/permissions in database
     */
    static clearCache(): void;
}
export declare const PERMISSIONS: {
    readonly 'users.view': "View users";
    readonly 'users.create': "Create users";
    readonly 'users.edit': "Edit users";
    readonly 'users.delete': "Delete users";
    readonly 'users.suspend': "Suspend/unsuspend users";
    readonly 'users.approve': "Approve users";
    readonly 'content.view': "View content";
    readonly 'content.create': "Create content";
    readonly 'content.edit': "Edit content";
    readonly 'content.delete': "Delete content";
    readonly 'content.publish': "Publish content";
    readonly 'content.moderate': "Moderate content";
    readonly 'admin.settings': "Manage system settings";
    readonly 'admin.analytics': "View analytics";
    readonly 'admin.logs': "View system logs";
    readonly 'admin.backup': "Manage backups";
    readonly 'acf.manage': "Manage custom fields";
    readonly 'cpt.manage': "Manage custom post types";
    readonly 'shortcodes.manage': "Manage shortcodes";
    readonly 'api.access': "Access API";
    readonly 'api.admin': "Admin API access";
};
export declare const ROLE_PERMISSIONS: Record<UserRole, string[]>;
//# sourceMappingURL=userRole.controller.d.ts.map