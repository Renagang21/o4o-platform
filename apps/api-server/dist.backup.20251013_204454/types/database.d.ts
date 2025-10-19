/**
 * Database and TypeORM type definitions
 */
export interface DatabaseConnectionPool {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
}
export interface TypeOrmDriver {
    pool?: DatabaseConnectionPool;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map