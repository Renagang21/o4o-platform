export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}
export interface Tag {
    id: string;
    name: string;
    slug: string;
    description?: string;
    postCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export type Theme = 'light' | 'dark' | 'system' | 'evening' | 'noon' | 'dusk' | 'afternoon' | 'twilight';
export interface UseBulkActionsProps {
    onDelete?: (ids: string[]) => void;
    onStatusChange?: (ids: string[], status: string) => void;
    onBulkEdit?: (ids: string[]) => void;
}
export interface ContactInfo {
    name: string;
    title: string;
    phone?: string;
    email?: string;
}
export interface PermissionObject {
    id: string;
    name: string;
    description?: string;
    resource: string;
    action: string;
}
/**
 * Role entity interface (database entity)
 * Note: For role string type, use `Role` from auth/roles.ts
 */
export interface RoleEntity {
    id: string;
    name: string;
    description?: string;
    permissions: PermissionObject[];
    isSystem?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=common.d.ts.map