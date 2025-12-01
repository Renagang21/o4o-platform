// General type definitions for API server

// Analytics types
export interface AnalyticsEvent {
  id?: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
  metadata?: AnalyticsMetadata;
  source?: string;
  ip?: string;
  userAgent?: string;
}

export interface AnalyticsMetadata {
  page?: string;
  referrer?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  [key: string]: unknown;
}

export interface UsageMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: MetricTags;
  metadata?: Record<string, unknown>;
}

export interface MetricTags {
  environment?: string;
  service?: string;
  endpoint?: string;
  userId?: string;
  [key: string]: string | undefined;
}

// Error tracking
export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  context?: ErrorContext;
  handled: boolean;
  resolved: boolean;
}

export interface ErrorContext {
  url?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  customData?: Record<string, unknown>;
}

// Performance types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  timestamp: Date;
}

// Graceful degradation types
export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime?: number;
  errorRate?: number;
  metadata?: Record<string, unknown>;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, unknown>;
}

// Database optimization types
export interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  source?: string;
}

// Common types
export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Note: User type is defined in ../entities/User.ts as a TypeORM entity

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

// Re-export all types
// export * from './crowdfunding-types.js';
export * from './form-builder.js';
export { 
  SlowQuery, IndexInfo, DuplicateIndex, TableStats, TableSize,
  ConnectionInfo, LockInfo, QueryPlan, PlanNode, QueryResult,
  DatabasePerformanceThresholds, PerformanceThresholds, ConnectionPoolStats,
  IndexRecommendation, QueryCacheEntry, QueryPattern, DatabaseMetrics,
  normalizeConnectionPoolStats, normalizePerformanceThresholds
} from './database-types.js';
export * from './graceful-degradation-types.js';
export { 
  QueryBuilderWithExecute, QueryType, OptimizedResponse, CacheHeaders,
  PerformanceReport, SlowQueryInfo, PerformanceAlert, PerformanceAlertData,
  CompressionLevel, RedisInfo, CacheMetrics, SystemMetrics, QueryPerformanceMetrics
} from './performance-types.js';