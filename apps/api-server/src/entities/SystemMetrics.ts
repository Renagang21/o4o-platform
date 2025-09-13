import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from 'typeorm';

// Type definitions for metrics
export interface MetricTags {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  device?: string;
  browser?: string;
  [key: string]: unknown;
}

export interface MetricMetadata {
  // Performance context
  requestSize?: number;
  responseSize?: number;
  cacheHit?: boolean;
  queryCount?: number;
  
  // Error context
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
  
  // Business context
  featureName?: string;
  actionType?: string;
  conversionStep?: string;
  
  // Custom properties
  [key: string]: unknown;
}

export enum MetricType {
  PERFORMANCE = 'performance',
  USAGE = 'usage',
  ERROR = 'error',
  SYSTEM = 'system',
  BUSINESS = 'business'
}

export enum MetricCategory {
  // Performance metrics
  RESPONSE_TIME = 'response_time',
  LOAD_TIME = 'load_time',
  API_LATENCY = 'api_latency',
  DATABASE_QUERY_TIME = 'database_query_time',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  NETWORK_LATENCY = 'network_latency',

  // Usage metrics
  ACTIVE_USERS = 'active_users',
  SESSION_DURATION = 'session_duration',
  PAGE_VIEWS = 'page_views',
  CONTENT_VIEWS = 'content_views',
  SIGNAGE_CREATIONS = 'signage_creations',
  FEEDBACK_SUBMISSIONS = 'feedback_submissions',
  
  // Error metrics
  ERROR_RATE = 'error_rate',
  ERROR_COUNT = 'error_count',
  FAILED_REQUESTS = 'failed_requests',
  TIMEOUT_COUNT = 'timeout_count',
  
  // System metrics
  UPTIME = 'uptime',
  THROUGHPUT = 'throughput',
  CONCURRENT_USERS = 'concurrent_users',
  STORAGE_USAGE = 'storage_usage',
  
  // Business metrics
  USER_ENGAGEMENT = 'user_engagement',
  FEATURE_ADOPTION = 'feature_adoption',
  CONVERSION_RATE = 'conversion_rate',
  RETENTION_RATE = 'retention_rate',
  
  // Auto-recovery metrics
  RECOVERY_ATTEMPTS = 'recovery_attempts',
  RECOVERY_SUCCESS_RATE = 'recovery_success_rate',
  RECOVERY_TIME = 'recovery_time',
  CIRCUIT_BREAKER_EVENTS = 'circuit_breaker_events',
  CIRCUIT_BREAKER_STATE = 'circuit_breaker_state',
  CIRCUIT_BREAKER_RESET = 'circuit_breaker_reset',
  CIRCUIT_BREAKER_MANUAL_OPEN = 'circuit_breaker_manual_open',
  DEGRADED_FEATURES = 'degraded_features',
  DEGRADATION_EVENT = 'degradation_event',
  DEGRADATION_ACTIVE = 'degradation_active',
  ESCALATION_EVENT = 'escalation_event',
  ACTIVE_ESCALATIONS = 'active_escalations',
  ACTIVE_DEPLOYMENTS = 'active_deployments',
  DEPLOYMENT_EVENT = 'deployment_event',
  SYSTEM_ISSUES = 'system_issues',
  HEALING_ACTIONS = 'healing_actions',
  DEPLOYMENT_EVENTS = 'deployment_events'
}

@Entity('system_metrics')
@Index(['metricType', 'metricCategory', 'created_at'])
@Index(['created_at'])
@Index(['source', 'created_at'])
export class SystemMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: MetricType })
  metricType!: MetricType;

  @Column({ type: 'enum', enum: MetricCategory })
  metricCategory!: MetricCategory;

  @Column({ type: 'varchar', length: 255 })
  metricName!: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string; // ms, bytes, %, count, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string; // api-server, main-site, admin-dashboard, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint?: string; // API endpoint or page URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  component?: string; // React component name or service name

  @Column({ type: 'varchar', length: 100, nullable: true })
  environment?: string; // development, staging, production

  // Context information
  @Column({ type: 'json', nullable: true })
  tags?: MetricTags;

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata?: MetricMetadata;

  @CreateDateColumn()
  createdAt!: Date;

  // Static factory methods
  static createPerformanceMetric(
    category: MetricCategory,
    name: string,
    value: number,
    unit: string,
    source?: string,
    endpoint?: string,
    metadata?: MetricMetadata
  ): Partial<SystemMetrics> {
    return {
      metricType: MetricType.PERFORMANCE,
      metricCategory: category,
      metricName: name,
      value: value.toString(),
      unit,
      source,
      endpoint,
      metadata
    };
  }

  static createUsageMetric(
    category: MetricCategory,
    name: string,
    value: number,
    unit: string,
    tags?: MetricTags,
    metadata?: MetricMetadata
  ): Partial<SystemMetrics> {
    return {
      metricType: MetricType.USAGE,
      metricCategory: category,
      metricName: name,
      value: value.toString(),
      unit,
      tags,
      metadata
    };
  }

  static createErrorMetric(
    category: MetricCategory,
    name: string,
    value: number,
    source?: string,
    endpoint?: string,
    errorInfo?: {
      errorType?: string;
      errorMessage?: string;
      stackTrace?: string;
    }
  ): Partial<SystemMetrics> {
    return {
      metricType: MetricType.ERROR,
      metricCategory: category,
      metricName: name,
      value: value.toString(),
      unit: 'count',
      source,
      endpoint,
      metadata: errorInfo
    };
  }

  static createSystemMetric(
    category: MetricCategory,
    name: string,
    value: number,
    unit: string,
    component?: string,
    metadata?: MetricMetadata
  ): Partial<SystemMetrics> {
    return {
      metricType: MetricType.SYSTEM,
      metricCategory: category,
      metricName: name,
      value: value.toString(),
      unit,
      component,
      metadata
    };
  }

  static createBusinessMetric(
    category: MetricCategory,
    name: string,
    value: number,
    unit: string,
    tags?: MetricTags,
    metadata?: MetricMetadata
  ): Partial<SystemMetrics> {
    return {
      metricType: MetricType.BUSINESS,
      metricCategory: category,
      metricName: name,
      value: value.toString(),
      unit,
      tags,
      metadata
    };
  }

  // Instance methods
  getDisplayName(): string {
    return this.metricName || this.metricCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getFormattedValue(): string {
    if (this.unit === 'ms') {
      return `${this.value}ms`;
    } else if (this.unit === 'bytes') {
      return this.formatBytes(parseFloat(this.value));
    } else if (this.unit === '%') {
      return `${this.value}%`;
    } else if (this.unit === 'count') {
      return this.value.toString();
    }
    return `${this.value} ${this.unit || ''}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isPerformanceMetric(): boolean {
    return this.metricType === MetricType.PERFORMANCE;
  }

  isErrorMetric(): boolean {
    return this.metricType === MetricType.ERROR;
  }

  isBusinessMetric(): boolean {
    return this.metricType === MetricType.BUSINESS;
  }

  getPerformanceRating(): 'excellent' | 'good' | 'average' | 'poor' | 'unknown' {
    if (!this.isPerformanceMetric()) return 'unknown';

    const numValue = parseFloat(this.value);

    switch (this.metricCategory) {
      case MetricCategory.RESPONSE_TIME:
      case MetricCategory.LOAD_TIME:
      case MetricCategory.API_LATENCY:
        if (numValue < 100) return 'excellent';
        if (numValue < 300) return 'good';
        if (numValue < 1000) return 'average';
        return 'poor';
        
      case MetricCategory.ERROR_RATE:
        if (numValue < 0.1) return 'excellent';
        if (numValue < 1) return 'good';
        if (numValue < 5) return 'average';
        return 'poor';
        
      case MetricCategory.CPU_USAGE:
      case MetricCategory.MEMORY_USAGE:
        if (numValue < 50) return 'excellent';
        if (numValue < 70) return 'good';
        if (numValue < 85) return 'average';
        return 'poor';
        
      default:
        return 'unknown';
    }
  }
}