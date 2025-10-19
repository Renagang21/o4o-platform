export interface SlowQuery {
    query: string;
    executionTime: number;
    rowsExamined: number;
    rowsSent: number;
    timestamp: Date;
    source?: string;
}
export interface IndexInfo {
    table: string;
    indexName: string;
    columns: string[];
    unique: boolean;
    cardinality: number;
    size: number;
}
export interface DuplicateIndex {
    table: string;
    redundantIndex: string;
    reasonIndex: string;
    columns: string[];
}
export interface TableStats {
    tableName: string;
    rowCount: number;
    dataSize: number;
    indexSize: number;
    totalSize: number;
    avgRowLength: number;
    autoIncrement?: number;
}
export interface TableSize {
    table: string;
    dataSize: number;
    indexSize: number;
    totalSize: number;
}
export interface ConnectionInfo {
    id: number;
    user: string;
    host: string;
    db: string | null;
    command: string;
    time: number;
    state: string;
    info: string | null;
}
export interface LockInfo {
    lockId: string;
    lockType: string;
    table: string;
    duration: number;
    waitingQueries: number;
}
export interface QueryPlan {
    query: string;
    plan: PlanNode[];
    estimatedCost: number;
    estimatedRows: number;
    Plan?: PlanNode;
    'Planning Time'?: number;
    'Execution Time'?: number;
    'Total Runtime'?: number;
}
export interface PlanNode {
    id: number;
    selectType: string;
    table: string;
    type: string;
    possibleKeys: string[];
    key: string | null;
    keyLen: string | null;
    ref: string | null;
    rows: number;
    filtered: number;
    extra: string;
    'Node Type'?: string;
    'Startup Cost'?: number;
    'Total Cost'?: number;
    'Plan Rows'?: number;
    'Plan Width'?: number;
    Plans?: PlanNode[];
}
export interface QueryResult {
    query: string;
    rows: any[];
    fields: any[];
    executionTime: number;
    affectedRows?: number;
}
export interface DatabasePerformanceThresholds {
    slowQueryTime: number;
    maxConnections: number;
    cacheHitRateThreshold: number;
    indexUsageThreshold: number;
    slowQueryThreshold?: number;
    verySlowQueryThreshold?: number;
    highConnectionUsage?: number;
    lowCacheHitRate?: number;
    longRunningTransactionThreshold?: number;
    tableAnalyzeThreshold?: number;
    deadlockThreshold?: number;
}
export declare function normalizePerformanceThresholds(thresholds: any): DatabasePerformanceThresholds;
export type PerformanceThresholds = DatabasePerformanceThresholds;
export interface ConnectionPoolStats {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    activeConnections?: number;
    idleConnections?: number;
    totalConnections?: number;
    waitingConnections?: number;
    maxConnections?: number;
    acquiredConnections?: number;
    releasedConnections?: number;
}
export declare function normalizeConnectionPoolStats(stats: any): ConnectionPoolStats;
export interface IndexRecommendation {
    table: string;
    columns: string[];
    reason: string;
    estimatedImprovement: number;
    query: string;
}
export interface QueryCacheEntry {
    query: string;
    result: any;
    timestamp: Date;
    hitCount: number;
    size: number;
}
export interface QueryPattern {
    pattern: string;
    count: number;
    totalTime: number;
    avgTime: number;
    examples: string[];
}
export interface QueryPerformanceMetrics {
    totalQueries: number;
    slowQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    indexUsageRate: number;
    averageQueryTime?: number;
}
export interface DatabaseMetrics {
    connectionPoolSize: number;
    activeConnections: number;
    slowQueries: number;
    cacheHitRate: number;
    timestamp: Date;
    queryPerformance?: QueryPerformanceMetrics;
}
//# sourceMappingURL=database-types.d.ts.map