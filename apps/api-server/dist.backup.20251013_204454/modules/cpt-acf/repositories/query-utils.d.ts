import type { SelectQueryBuilder } from 'typeorm';
export interface Paging {
    limit: number;
    offset: number;
}
export declare function normalizePaging(params?: {
    limit?: number;
    offset?: number;
    page?: number;
    per_page?: number;
}): Paging;
export declare function applyPagination<T>(qb: SelectQueryBuilder<T>, paging: Paging): void;
export declare function applySearch<T>(qb: SelectQueryBuilder<T>, clauses: string[], paramValue: string): void;
export declare function toPage<T>(items: T[], total: number, paging: Paging): {
    items: T[];
    total: number;
    limit: number;
    offset: number;
};
//# sourceMappingURL=query-utils.d.ts.map