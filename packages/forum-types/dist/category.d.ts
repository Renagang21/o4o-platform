import type { BaseEntity } from '@o4o/types';
export type CategoryAccessLevel = 'all' | 'member' | 'business' | 'admin';
export interface ForumCategory extends BaseEntity {
    name: string;
    description?: string;
    slug: string;
    color?: string;
    sortOrder: number;
    isActive: boolean;
    requireApproval: boolean;
    accessLevel: CategoryAccessLevel;
    postCount: number;
    createdBy?: string;
    posts?: any[];
    creator?: any;
}
export interface CategoryFormData {
    name: string;
    description?: string;
    slug?: string;
    color?: string;
    sortOrder?: number;
    isActive?: boolean;
    requireApproval?: boolean;
    accessLevel?: CategoryAccessLevel;
}
export interface CategoryFilters {
    isActive?: boolean;
    accessLevel?: CategoryAccessLevel;
    search?: string;
    sortBy?: 'name' | 'sortOrder' | 'postCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}
//# sourceMappingURL=category.d.ts.map