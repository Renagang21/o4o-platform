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
//# sourceMappingURL=common.d.ts.map