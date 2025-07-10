export interface Permission {
    resource: string;
    action: string;
}
export declare const PERMISSIONS: {
    readonly USERS_VIEW: "users.view";
    readonly USERS_CREATE: "users.create";
    readonly USERS_EDIT: "users.edit";
    readonly USERS_DELETE: "users.delete";
    readonly USERS_APPROVE: "users.approve";
    readonly CONTENT_VIEW: "content.view";
    readonly CONTENT_CREATE: "content.create";
    readonly CONTENT_EDIT: "content.edit";
    readonly CONTENT_DELETE: "content.delete";
    readonly CONTENT_PUBLISH: "content.publish";
    readonly PRODUCTS_VIEW: "products.view";
    readonly PRODUCTS_CREATE: "products.create";
    readonly PRODUCTS_EDIT: "products.edit";
    readonly PRODUCTS_DELETE: "products.delete";
    readonly PRODUCTS_MANAGE_INVENTORY: "products.manage_inventory";
    readonly ORDERS_VIEW: "orders.view";
    readonly ORDERS_EDIT: "orders.edit";
    readonly ORDERS_PROCESS: "orders.process";
    readonly ORDERS_REFUND: "orders.refund";
    readonly ANALYTICS_VIEW: "analytics.view";
    readonly ANALYTICS_EXPORT: "analytics.export";
    readonly MEDIA_VIEW: "media.view";
    readonly MEDIA_UPLOAD: "media.upload";
    readonly MEDIA_DELETE: "media.delete";
    readonly SETTINGS_VIEW: "settings.view";
    readonly SETTINGS_EDIT: "settings.edit";
    readonly SETTINGS_SYSTEM: "settings.system";
    readonly ADMIN_ACCESS: "admin.access";
    readonly ADMIN_USERS: "admin.users";
    readonly ADMIN_SYSTEM: "admin.system";
};
export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export declare const usePermissions: () => {
    checkPermission: (permission: PermissionKey) => boolean;
    checkMultiplePermissions: (permissions: PermissionKey[], requireAll?: boolean) => boolean;
    getRoleBasedPermissions: () => PermissionKey[];
    canAccessMenu: (menuId: string) => boolean;
    isAdmin: boolean;
    userRole: string | undefined;
    userPermissions: string[];
};
export default usePermissions;
//# sourceMappingURL=usePermissions.d.ts.map