import { Permission } from './Permission';
export declare class Role {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    isActive: boolean;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions: Permission[];
    users?: any[];
    hasPermission(permissionKey: string): boolean;
    hasAnyPermission(permissionKeys: string[]): boolean;
    hasAllPermissions(permissionKeys: string[]): boolean;
    getActivePermissions(): Permission[];
    getPermissionKeys(): string[];
    toJSON(): {
        id: string;
        name: string;
        displayName: string;
        description: string;
        isActive: boolean;
        isSystem: boolean;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
    };
}
//# sourceMappingURL=Role.d.ts.map