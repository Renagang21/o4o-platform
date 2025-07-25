// Graceful degradation types

export interface DegradationMetadata {
  level: string;
  reason: string;
  startTime: Date;
  affectedServices: string[];
  metrics?: Record<string, any>;
  activated?: boolean;
}

export interface DegradationParameters {
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: string[];
}

export interface DisableFeatureParams {
  feature: string;
  reason: string;
  temporary: boolean;
  fallback?: string;
}

export interface ReduceFunctionalityParams {
  service: string;
  reductionLevel: number;
  preserveCore: boolean;
  alternatives?: string[];
}

export interface CacheFallbackParams {
  enableStaleCache: boolean;
  maxStaleAge: number;
  cacheOnly: boolean;
}

export interface StaticContentParams {
  enableStaticMode: boolean;
  staticPages: string[];
  disableDynamic: boolean;
}

export interface SimplifiedUIParams {
  removeFeatures: string[];
  simplifyLayout: boolean;
  disableAnimations: boolean;
  reducedMedia: boolean;
}

export interface RateLimitParams {
  requestsPerMinute: number;
  burstLimit: number;
  priorityUsers?: string[];
}

export interface RequestQueuingParams {
  maxQueueSize: number;
  timeout: number;
  priorityLevels: number;
}

export interface RedirectTrafficParams {
  targetServer: string;
  percentage: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface FeatureState {
  name: string;
  enabled: boolean;
  degraded: boolean;
  fallback?: string;
  metadata?: Record<string, any>;
}

export interface IsolationParameters {
  isolatedServices: string[];
  communicationMode: 'sync' | 'async' | 'disabled';
  fallbackBehavior: string;
}