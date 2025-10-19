import type { DataSource, EntityManager } from 'typeorm';
export declare function withTransaction<T>(ds: DataSource, fn: (m: EntityManager) => Promise<T>): Promise<T>;
//# sourceMappingURL=transaction.d.ts.map