import type { BaseEntity } from '@o4o/types';
export interface ForumTag extends BaseEntity {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    usageCount: number;
    isActive: boolean;
    posts?: any[];
}
export interface TagFormData {
    name: string;
    description?: string;
    color?: string;
    isActive?: boolean;
}
export interface TagFilters {
    search?: string;
    isActive?: boolean;
    minUsageCount?: number;
    sortBy?: 'name' | 'usageCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
}
export interface TagCloud {
    tags: Array<{
        id: string;
        name: string;
        count: number;
        size: 'sm' | 'md' | 'lg' | 'xl';
    }>;
    totalTags: number;
}
//# sourceMappingURL=tag.d.ts.map