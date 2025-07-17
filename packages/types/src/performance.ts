/**
 * Performance optimization type definitions
 */

// Query builder types
export type QueryType = 'select' | 'update' | 'delete' | 'insert';

export interface QueryBuilderWithExecute<T = unknown> {
  execute(): Promise<T>;
  getMany?(): Promise<T[]>;
  getSql?(): string;
}

// Performance metrics
export interface PerformanceMetric {
  name: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastUpdated: Date;
}

export interface QueryPerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
}

// Performance alerts
export interface PerformanceAlert {
  id: string;
  type: 'high_cpu' | 'high_memory' | 'slow_query' | 'high_error_rate' | 'cache_issue';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  data: PerformanceAlertData;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceAlertData {
  metric?: string;
  currentValue?: number;
  threshold?: number;
  details?: string;
  [key: string]: unknown;
}

// Cache headers
export interface CacheHeaders {
  cacheControl: string;
  etag: string;
  lastModified: string;
  expires?: string;
}

// Redis info types
export interface RedisInfo {
  server: {
    redis_version: string;
    redis_mode: string;
    uptime_in_seconds: number;
    process_id: number;
  };
  clients: {
    connected_clients: number;
    client_recent_max_input_buffer: number;
    client_recent_max_output_buffer: number;
    blocked_clients: number;
  };
  memory: {
    used_memory: number;
    used_memory_human: string;
    used_memory_rss: number;
    used_memory_peak: number;
    used_memory_peak_human: string;
    total_system_memory: number;
    total_system_memory_human: string;
    maxmemory: number;
    maxmemory_human: string;
    maxmemory_policy: string;
  };
  persistence: {
    loading: number;
    rdb_changes_since_last_save: number;
    rdb_bgsave_in_progress: number;
    rdb_last_save_time: number;
    aof_enabled: number;
    aof_rewrite_in_progress: number;
  };
  stats: {
    total_connections_received: number;
    total_commands_processed: number;
    instantaneous_ops_per_sec: number;
    rejected_connections: number;
    sync_full: number;
    sync_partial_ok: number;
    sync_partial_err: number;
    expired_keys: number;
    evicted_keys: number;
    keyspace_hits: number;
    keyspace_misses: number;
    pubsub_channels: number;
    pubsub_patterns: number;
    latest_fork_usec: number;
  };
  replication: {
    role: string;
    connected_slaves: number;
    master_replid: string;
    master_replid2: string;
    master_repl_offset: number;
    repl_backlog_active: number;
    repl_backlog_size: number;
    repl_backlog_first_byte_offset: number;
    repl_backlog_histlen: number;
  };
  cpu: {
    used_cpu_sys: number;
    used_cpu_user: number;
    used_cpu_sys_children: number;
    used_cpu_user_children: number;
  };
  keyspace: Record<string, { keys: number; expires: number; avg_ttl: number }>;
}

// Optimization results
export interface OptimizationResult {
  success: boolean;
  optimizationType: string;
  improvements: string[];
  performanceGain?: number;
  error?: string;
}

// Response optimization
export interface OptimizedResponse<T = unknown> {
  data: T;
  compressed: boolean;
  cacheHeaders: CacheHeaders;
  size: number;
  compressionRatio?: number;
}

// Performance report
export interface PerformanceReport {
  timestamp: Date;
  queryMetrics: QueryPerformanceMetrics;
  cacheMetrics: CacheMetrics;
  systemMetrics: SystemMetrics;
  slowQueries: SlowQueryInfo[];
  alerts: PerformanceAlert[];
  recommendations?: string[];
}

export interface SlowQueryInfo {
  query: string;
  executionTime: number;
  timestamp: Date;
  optimized: boolean;
  optimizationSuggestions?: string[];
}

// Compression levels
export type CompressionLevel = 'low' | 'medium' | 'high';

// Data optimization
export interface DataOptimizationOptions {
  removeNulls?: boolean;
  removeEmptyStrings?: boolean;
  removeEmptyArrays?: boolean;
  removeEmptyObjects?: boolean;
  truncateStrings?: number;
  maxDepth?: number;
}

// Performance thresholds
export interface PerformanceThresholds {
  cpuThreshold: number;
  memoryThreshold: number;
  queryTimeThreshold: number;
  errorRateThreshold: number;
  cacheHitRateThreshold: number;
}

// Auto-optimization config
export interface AutoOptimizationConfig {
  enabled: boolean;
  indexCreationEnabled: boolean;
  queryCachingEnabled: boolean;
  compressionEnabled: boolean;
  cacheEvictionEnabled: boolean;
}

// Performance snapshot
export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    queries: QueryPerformanceMetrics;
    cache: CacheMetrics;
    system: SystemMetrics;
    database: {
      activeConnections: number;
      slowQueries: number;
      lockedQueries: number;
      replicationLag?: number;
    };
  };
  health: {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    score: number; // 0-100
  };
}