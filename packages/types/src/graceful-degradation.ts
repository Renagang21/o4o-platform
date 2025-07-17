/**
 * Graceful degradation type definitions
 */

// Core degradation types
export type DegradationLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type DegradationType = 
  | 'disable_feature'
  | 'reduce_functionality' 
  | 'cache_fallback'
  | 'static_content'
  | 'simplified_ui'
  | 'rate_limit'
  | 'request_queuing'
  | 'redirect_traffic';

export interface DegradationRule {
  id: string;
  name: string;
  trigger: DegradationTrigger;
  actions: DegradationAction[];
  priority: number;
  enabled: boolean;
  metadata?: DegradationMetadata;
}

export interface DegradationTrigger {
  type: 'metric' | 'error_rate' | 'manual' | 'time_based' | 'dependency';
  threshold: number;
  duration?: number;
  condition?: string;
}

export interface DegradationAction {
  type: DegradationType;
  target: string;
  parameters: DegradationParameters;
  priority: number;
}

// Parameter types for different degradation types
export type DegradationParameters = 
  | DisableFeatureParams
  | ReduceFunctionalityParams
  | CacheFallbackParams
  | StaticContentParams
  | SimplifiedUIParams
  | RateLimitParams
  | RequestQueuingParams
  | RedirectTrafficParams;

export interface DisableFeatureParams {
  featureName: string;
  fallbackMessage?: string;
  affectedEndpoints?: string[];
}

export interface ReduceFunctionalityParams {
  features: string[];
  level: 'minimal' | 'basic' | 'standard';
  preserveCore: boolean;
}

export interface CacheFallbackParams {
  cacheKey: string;
  ttl: number;
  fallbackData?: unknown;
  staleWhileRevalidate?: boolean;
}

export interface StaticContentParams {
  contentPath: string;
  lastUpdated?: Date;
  expiryTime?: number;
}

export interface SimplifiedUIParams {
  removeAnimations: boolean;
  disableImages?: boolean;
  minimalCSS?: boolean;
  essentialOnly?: boolean;
}

export interface RateLimitParams {
  requestsPerMinute: number;
  burstSize?: number;
  keyBy?: 'ip' | 'user' | 'session';
  whitelist?: string[];
}

export interface RequestQueuingParams {
  maxQueueSize: number;
  timeoutMs: number;
  priority?: 'fifo' | 'lifo' | 'priority';
}

export interface RedirectTrafficParams {
  targetUrl: string;
  percentage?: number;
  preservePath?: boolean;
  statusCode?: 301 | 302 | 303 | 307 | 308;
}

// Metadata and tracking
export interface DegradationMetadata {
  description?: string;
  owner?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  documentation?: string;
  [key: string]: unknown;
}

export interface ActiveDegradation {
  id: string;
  ruleId: string;
  type: DegradationType;
  level: DegradationLevel;
  startTime: Date;
  endTime?: Date;
  reason: string;
  affectedComponents: string[];
  metadata?: DegradationMetadata;
}

// Health tracking
export interface ComponentHealth {
  componentId: string;
  health: number; // 0-100
  status: 'healthy' | 'degraded' | 'critical' | 'failed';
  lastCheck: Date;
  metrics: HealthMetrics;
  issues: HealthIssue[];
}

export interface HealthMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  availability: number;
  saturation: number;
}

export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

// Circuit breaker
export interface CircuitBreakerState {
  componentId: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  metadata?: Record<string, unknown>;
}

// Recovery
export interface RecoveryPlan {
  componentId: string;
  steps: RecoveryStep[];
  estimatedTime: number;
  priority: number;
  autoRecover: boolean;
}

export interface RecoveryStep {
  action: string;
  description: string;
  timeout: number;
  retries: number;
  onFailure?: 'continue' | 'stop' | 'rollback';
}

// State management
export interface DegradationState {
  featureId: string;
  normalState: FeatureState;
  degradedState: FeatureState;
  currentState: FeatureState;
}

export interface FeatureState {
  enabled: boolean;
  functionality: Record<string, boolean>;
  limits?: Record<string, number>;
  config?: Record<string, unknown>;
}

// Configuration
export interface DegradationConfig {
  enabled: boolean;
  autoRecovery: boolean;
  healthCheckInterval: number;
  recoveryDelay: number;
  maxDegradationLevel: DegradationLevel;
  priorities: {
    [component: string]: number;
  };
}

// Events
export interface DegradationEvent {
  id: string;
  type: 'degradation_started' | 'degradation_ended' | 'recovery_started' | 'recovery_completed' | 'health_check';
  componentId: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

// Isolation
export interface IsolationResult {
  output: string;
  isolated: boolean;
  fallbackUsed: boolean;
  duration: number;
  error?: string;
}

export interface IsolationParameters {
  timeout?: number;
  fallbackFunction?: string;
  cacheKey?: string;
  retries?: number;
}

// Monitoring
export interface DegradationMetrics {
  activeDegradations: number;
  totalDegradations: number;
  averageDuration: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  componentHealth: Record<string, number>;
  impactedUsers: number;
}