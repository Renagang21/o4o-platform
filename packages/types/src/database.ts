/**
 * Database-related type definitions
 */

// Query result types
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  command: string;
  fields?: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  format: string;
}

// Query performance types
export interface SlowQuery {
  query: string;
  duration: number;
  calls: number;
  mean: number;
  min: number;
  max: number;
  total: number;
  timestamp: Date;
}

// Index types
export interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
  size: string;
  used: boolean;
}

export interface DuplicateIndex {
  indexname: string;
  tablename: string;
  duplicate_of: string;
  index_size: string;
}

// Table statistics
export interface TableStats {
  schemaname: string;
  tablename: string;
  n_live_tup: number;
  n_dead_tup: number;
  last_vacuum: Date | null;
  last_autovacuum: Date | null;
  last_analyze: Date | null;
  last_autoanalyze: Date | null;
  vacuum_count: number;
  autovacuum_count: number;
  analyze_count: number;
  autoanalyze_count: number;
}

export interface TableSize {
  schema: string;
  table: string;
  size: string;
  total_size: string;
  index_size: string;
  toast_size: string;
  row_estimate: number;
}

// Connection types
export interface ConnectionInfo {
  pid: number;
  usename: string;
  application_name: string;
  client_addr: string;
  backend_start: Date;
  state: string;
  state_change: Date;
  query: string;
  wait_event_type: string | null;
  wait_event: string | null;
}

export interface LockInfo {
  pid: number;
  mode: string;
  granted: boolean;
  locktype: string;
  relation: string;
  duration: number;
}

// Query plan types
export interface QueryPlan {
  'Plan': PlanNode;
  'Planning Time'?: number;
  'Execution Time'?: number;
  'Total Runtime'?: number;
}

export interface PlanNode {
  'Node Type': string;
  'Startup Cost': number;
  'Total Cost': number;
  'Plan Rows': number;
  'Plan Width': number;
  'Actual Startup Time'?: number;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Relation Name'?: string;
  'Alias'?: string;
  'Plans'?: PlanNode[];
  'Sort Key'?: string[];
  'Index Name'?: string;
  'Index Cond'?: string;
  'Filter'?: string;
  'Join Type'?: string;
  'Hash Cond'?: string;
  'Merge Cond'?: string;
}

// Optimization types
export interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  performanceGain: number;
  appliedOptimizations: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  reason: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  priority: number;
}

export interface DatabasePerformanceAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
}

// Pattern optimization
export interface PatternOptimization {
  pattern: string;
  optimization: string;
  description: string;
  example: {
    before: string;
    after: string;
  };
  conditions: string[];
}

// Service types
export interface QueryCacheEntry {
  query: string;
  result: unknown;
  timestamp: Date;
  ttl: number;
  hitCount: number;
}

export interface ConnectionPoolStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingConnections: number;
  maxConnections: number;
  acquiredConnections: number;
  releasedConnections: number;
}

export interface DatabasePerformanceThresholds {
  slowQueryThreshold: number;
  verySlowQueryThreshold: number;
  highConnectionUsage: number;
  lowCacheHitRate: number;
  longRunningTransactionThreshold: number;
  tableAnalyzeThreshold: number;
  deadlockThreshold: number;
}

export interface DatabaseMetrics {
  queryPerformance: {
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
  };
  indexAnalysis: {
    totalIndexes: number;
    unusedIndexes: number;
    duplicateIndexes: number;
    missingIndexes: number;
  };
  tableStats: {
    totalTables: number;
    tablesNeedingVacuum: number;
    tablesNeedingAnalyze: number;
    totalDeadTuples: number;
  };
  connectionPool: ConnectionPoolStats;
  alerts: DatabasePerformanceAlert[];
  recommendations: IndexRecommendation[];
}

export interface QueryPattern {
  pattern: string;
  count: number;
  avgDuration: number;
  tables: string[];
  operations: string[];
}

export interface VacuumAnalyzeResult {
  success: boolean;
  table: string;
  operation: 'vacuum' | 'analyze' | 'vacuum_analyze';
  duration: number;
  error?: string;
}

// Additional types needed by DatabaseOptimizationService
export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsReturned: number;
  cost: number;
  plan?: PlanNode;
}

export interface IndexAnalysis {
  tableName: string;
  indexName: string;
  size: string;
  scans: number;
  effectiveness: number;
}

export interface CacheHitRate {
  rate: number;
  hits: number;
  misses: number;
}

export interface ConnectionPoolMetrics {
  active: number;
  idle: number;
  total: number;
  waitingClients: number;
}

export interface DatabaseHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  issues: string[];
}

export interface VacuumStatus {
  tableName: string;
  lastVacuum: Date | null;
  lastAutoVacuum: Date | null;
  deadTuples: number;
  liveTuples: number;
}

export interface DeadTupleInfo {
  tableName: string;
  deadTuples: number;
  liveTuples: number;
  ratio: number;
}

export interface DatabaseDashboard {
  metrics: DatabasePerformanceMetrics;
  alerts: any[];
  recommendations: any[];
  health: DatabaseHealthCheck;
}

export interface DatabasePerformanceMetrics {
  queryPerformance: {
    avgExecutionTime: number;
    slowQueries: number;
    totalQueries: number;
  };
  connectionPool: ConnectionPoolMetrics;
  cache: CacheHitRate;
  storage: {
    databaseSize: string;
    tableCount: number;
    indexCount: number;
  };
}

// PerformanceReport is defined in performance.ts