export interface QueryBuilderWithExecute {
    execute(): Promise<any>;
    getQuery(): string;
    getParameters(): any[];
}
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'aggregate';
export interface OptimizedResponse {
    data: any;
    cached: boolean;
    executionTime: number;
    cacheKey?: string;
    headers?: CacheHeaders;
}
export interface CacheHeaders {
    'Cache-Control'?: string;
    'ETag'?: string;
    'Last-Modified'?: string;
    'Expires'?: string;
}
export interface PerformanceReport {
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        averageResponseTime: number;
        totalRequests: number;
        errorRate: number;
        cacheHitRate: number;
        slowQueries: SlowQueryInfo[];
        resourceUsage: SystemMetrics;
    };
    recommendations: string[];
    alerts?: PerformanceAlert[];
    queryMetrics?: QueryPerformanceMetrics;
    cacheMetrics?: CacheMetrics;
    systemMetrics?: SystemMetrics;
    timestamp?: Date;
    slowQueries?: SlowQueryInfo[];
}
export interface SlowQueryInfo {
    query: string;
    executionTime: number;
    frequency: number;
    impact: 'low' | 'medium' | 'high';
    timestamp?: Date;
    optimized?: boolean;
}
export interface PerformanceAlert {
    type: string;
    severity: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    data: PerformanceAlertData;
    id?: string;
}
export interface PerformanceAlertData {
    metric: string;
    currentValue: number;
    threshold: number;
    duration?: number;
    details?: any;
    current?: number;
    error?: any;
}
export type CompressionLevel = 'none' | 'fast' | 'default' | 'best' | 'low' | 'medium' | 'high';
export interface RedisInfo {
    version: string;
    connectedClients: number;
    usedMemory: number;
    maxMemory: number;
    evictedKeys: number;
    hitRate: number;
    commandsProcessed: number;
    server?: any;
    stats?: any;
    memory?: any;
    keyspace?: any;
}
export interface QueryPerformanceMetrics {
    totalQueries: number;
    slowQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    indexUsageRate: number;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
    memoryUsage: number;
    hitRate: number;
    sets?: number;
}
export interface SystemMetrics {
    cpu: number;
    memory: number;
    disk: number;
    network: {
        incoming: number;
        outgoing: number;
    };
    timestamp: Date;
    cpuUsage?: number;
}
//# sourceMappingURL=performance-types.d.ts.map