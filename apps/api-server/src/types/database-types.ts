// Database optimization types

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
  // Alternative property names for compatibility
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
  // Additional properties for PostgreSQL EXPLAIN format
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
  // Required properties
  slowQueryTime: number;
  maxConnections: number;
  cacheHitRateThreshold: number;
  indexUsageThreshold: number;
  // Alternative properties for compatibility
  slowQueryThreshold?: number;
  verySlowQueryThreshold?: number;
  highConnectionUsage?: number;
  lowCacheHitRate?: number;
  longRunningTransactionThreshold?: number;
  tableAnalyzeThreshold?: number;
  deadlockThreshold?: number;
}

// Helper function to convert legacy format to new format
export function normalizePerformanceThresholds(thresholds: any): DatabasePerformanceThresholds {
  return {
    slowQueryTime: thresholds.slowQueryTime ?? thresholds.slowQueryThreshold ?? 1000,
    maxConnections: thresholds.maxConnections ?? thresholds.highConnectionUsage ?? 100,
    cacheHitRateThreshold: thresholds.cacheHitRateThreshold ?? thresholds.lowCacheHitRate ?? 0.8,
    indexUsageThreshold: thresholds.indexUsageThreshold ?? 0.9,
    slowQueryThreshold: thresholds.slowQueryThreshold,
    verySlowQueryThreshold: thresholds.verySlowQueryThreshold,
    highConnectionUsage: thresholds.highConnectionUsage,
    lowCacheHitRate: thresholds.lowCacheHitRate,
    longRunningTransactionThreshold: thresholds.longRunningTransactionThreshold,
    tableAnalyzeThreshold: thresholds.tableAnalyzeThreshold,
    deadlockThreshold: thresholds.deadlockThreshold
  };
}

// Type alias for backward compatibility
export type PerformanceThresholds = DatabasePerformanceThresholds;

export interface ConnectionPoolStats {
  // Required properties
  total: number;
  active: number;
  idle: number;
  waiting: number;
  // Alternative properties for compatibility
  activeConnections?: number;
  idleConnections?: number;
  totalConnections?: number;
  waitingConnections?: number;
  maxConnections?: number;
  acquiredConnections?: number;
  releasedConnections?: number;
}

// Helper function to convert legacy format to new format
export function normalizeConnectionPoolStats(stats: any): ConnectionPoolStats {
  return {
    total: stats.total ?? stats.totalConnections ?? 0,
    active: stats.active ?? stats.activeConnections ?? 0,
    idle: stats.idle ?? stats.idleConnections ?? 0,
    waiting: stats.waiting ?? stats.waitingConnections ?? 0,
    activeConnections: stats.activeConnections,
    idleConnections: stats.idleConnections,
    totalConnections: stats.totalConnections,
    waitingConnections: stats.waitingConnections,
    maxConnections: stats.maxConnections,
    acquiredConnections: stats.acquiredConnections,
    releasedConnections: stats.releasedConnections
  };
}

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