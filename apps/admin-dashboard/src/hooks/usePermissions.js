import { useAuthStore } from '@/api/authStore';
export const PERMISSIONS = {
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',
    USERS_APPROVE: 'users.approve',
    CONTENT_VIEW: 'content.view',
    CONTENT_CREATE: 'content.create',
    CONTENT_EDIT: 'content.edit',
    CONTENT_DELETE: 'content.delete',
    CONTENT_PUBLISH: 'content.publish',
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',
    PRODUCTS_MANAGE_INVENTORY: 'products.manage_inventory',
    ORDERS_VIEW: 'orders.view',
    ORDERS_EDIT: 'orders.edit',
    ORDERS_PROCESS: 'orders.process',
    ORDERS_REFUND: 'orders.refund',
    ANALYTICS_VIEW: 'analytics.view',
    ANALYTICS_EXPORT: 'analytics.export',
    MEDIA_VIEW: 'media.view',
    MEDIA_UPLOAD: 'media.upload',
    MEDIA_DELETE: 'media.delete',
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_EDIT: 'settings.edit',
    SETTINGS_SYSTEM: 'settings.system',
    ADMIN_ACCESS: 'admin.access',
    ADMIN_USERS: 'admin.users',
    ADMIN_SYSTEM: 'admin.system'
};
export const usePermissions = () => {
    const { hasPermission, isAdmin, user } = useAuthStore();
    const checkPermission = (permission) => {
        return hasPermission(permission);
    };
    const checkMultiplePermissions = (permissions, requireAll = false) => {
        if (requireAll) {
            return permissions.every(permission => hasPermission(permission));
        }
        return permissions.some(permission => hasPermission(permission));
    };
    const getRoleBasedPermissions = () => {
        if (!user)
            return [];
        const rolePermissions = {
            'admin': Object.values(PERMISSIONS),
            'manager': [
                PERMISSIONS.USERS_VIEW,
                PERMISSIONS.USERS_EDIT,
                PERMISSIONS.CONTENT_VIEW,
                PERMISSIONS.CONTENT_CREATE,
                PERMISSIONS.CONTENT_EDIT,
                PERMISSIONS.CONTENT_PUBLISH,
                PERMISSIONS.PRODUCTS_VIEW,
                PERMISSIONS.PRODUCTS_CREATE,
                PERMISSIONS.PRODUCTS_EDIT,
                PERMISSIONS.ORDERS_VIEW,
                PERMISSIONS.ORDERS_EDIT,
                PERMISSIONS.ORDERS_PROCESS,
                PERMISSIONS.ANALYTICS_VIEW,
                PERMISSIONS.MEDIA_VIEW,
                PERMISSIONS.MEDIA_UPLOAD,
                PERMISSIONS.SETTINGS_VIEW
            ],
            'editor': [
                PERMISSIONS.CONTENT_VIEW,
                PERMISSIONS.CONTENT_CREATE,
                PERMISSIONS.CONTENT_EDIT,
                PERMISSIONS.CONTENT_PUBLISH,
                PERMISSIONS.MEDIA_VIEW,
                PERMISSIONS.MEDIA_UPLOAD
            ],
            'operator': [
                PERMISSIONS.ORDERS_VIEW,
                PERMISSIONS.ORDERS_EDIT,
                PERMISSIONS.ORDERS_PROCESS,
                PERMISSIONS.PRODUCTS_VIEW,
                PERMISSIONS.PRODUCTS_EDIT,
                PERMISSIONS.PRODUCTS_MANAGE_INVENTORY
            ]
        };
        return rolePermissions[user.role] || [];
    };
    const canAccessMenu = (menuId) => {
        const menuPermissions = {
            'dashboard': [PERMISSIONS.ADMIN_ACCESS],
            'users': [PERMISSIONS.USERS_VIEW, PERMISSIONS.ADMIN_USERS],
            'content': [PERMISSIONS.CONTENT_VIEW],
            'products': [PERMISSIONS.PRODUCTS_VIEW],
            'orders': [PERMISSIONS.ORDERS_VIEW],
            'analytics': [PERMISSIONS.ANALYTICS_VIEW],
            'media': [PERMISSIONS.MEDIA_VIEW],
            'settings': [PERMISSIONS.SETTINGS_VIEW]
        };
        const requiredPermissions = menuPermissions[menuId];
        if (!requiredPermissions)
            return true;
        return checkMultiplePermissions(requiredPermissions, false);
    };
    return {
        checkPermission,
        checkMultiplePermissions,
        getRoleBasedPermissions,
        canAccessMenu,
        isAdmin: isAdmin(),
        userRole: user?.role,
        userPermissions: user?.permissions || []
    };
};
export default usePermissions;
//# sourceMappingURL=usePermissions.js.map