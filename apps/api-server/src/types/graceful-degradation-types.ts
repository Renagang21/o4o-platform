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
  features?: string[];
  level?: string;
}

export interface CacheFallbackParams {
  enableStaleCache: boolean;
  maxStaleAge: number;
  cacheOnly: boolean;
  cacheKey?: string;
  ttl?: number;
  staleWhileRevalidate?: boolean;
  fallbackData?: any;
}

export interface StaticContentParams {
  enableStaticMode: boolean;
  staticPages: string[];
  disableDynamic: boolean;
  contentPath?: string;
  expiryTime?: number;
}

export interface SimplifiedUIParams {
  removeFeatures: string[];
  simplifyLayout: boolean;
  disableAnimations: boolean;
  reducedMedia: boolean;
  removeAnimations?: boolean;
  disableImages?: boolean;
  minimalCSS?: boolean;
  essentialOnly?: boolean;
}

export interface RateLimitParams {
  requestsPerMinute: number;
  burstLimit: number;
  priorityUsers?: string[];
  burstSize?: number;
  keyBy?: string;
}

export interface RequestQueuingParams {
  maxQueueSize: number;
  timeout: number;
  priorityLevels: number;
  timeoutMs?: number;
  priority?: string;
}

export interface RedirectTrafficParams {
  targetServer: string;
  percentage: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  targetUrl?: string;
  preservePath?: boolean;
  statusCode?: number;
}

export interface FeatureState {
  name: string;
  enabled: boolean;
  degraded: boolean;
  fallback?: string;
  metadata?: Record<string, any>;
  functionality?: string | number | Record<string, any>;
  limits?: Record<string, any>;
}

export interface IsolationParameters {
  isolatedServices: string[];
  communicationMode: 'sync' | 'async' | 'disabled';
  fallbackBehavior: string;
  fallbackFunction?: any;
}

// Type conversion helpers
export function convertToDisableFeatureParams(params: DegradationParameters): DisableFeatureParams {
  return {
    feature: (params as any).feature || 'unknown',
    reason: (params as any).reason || `Severity: ${params.severity}`,
    temporary: true,
    fallback: (params as any).fallback
  };
}

export function convertToReduceFunctionalityParams(params: DegradationParameters): ReduceFunctionalityParams {
  return {
    service: (params as any).service || 'default',
    reductionLevel: params.threshold,
    preserveCore: params.severity !== 'critical',
    alternatives: (params as any).alternatives,
    features: (params as any).features,
    level: params.severity
  };
}

export function convertToCacheFallbackParams(params: DegradationParameters): CacheFallbackParams {
  return {
    enableStaleCache: true,
    maxStaleAge: params.duration,
    cacheOnly: params.severity === 'critical',
    cacheKey: (params as any).cacheKey,
    ttl: (params as any).ttl || params.duration,
    staleWhileRevalidate: (params as any).staleWhileRevalidate,
    fallbackData: (params as any).fallbackData
  };
}

export function convertToStaticContentParams(params: DegradationParameters): StaticContentParams {
  return {
    enableStaticMode: true,
    staticPages: (params as any).staticPages || [],
    disableDynamic: params.severity === 'critical',
    contentPath: (params as any).contentPath,
    expiryTime: (params as any).expiryTime || params.duration
  };
}

export function convertToSimplifiedUIParams(params: DegradationParameters): SimplifiedUIParams {
  return {
    removeFeatures: (params as any).removeFeatures || [],
    simplifyLayout: true,
    disableAnimations: true,
    reducedMedia: params.severity !== 'low',
    removeAnimations: (params as any).removeAnimations,
    disableImages: (params as any).disableImages,
    minimalCSS: (params as any).minimalCSS,
    essentialOnly: (params as any).essentialOnly
  };
}

export function convertToRateLimitParams(params: DegradationParameters): RateLimitParams {
  return {
    requestsPerMinute: params.threshold,
    burstLimit: Math.ceil(params.threshold * 1.5),
    priorityUsers: (params as any).priorityUsers,
    burstSize: (params as any).burstSize,
    keyBy: (params as any).keyBy
  };
}

export function convertToRequestQueuingParams(params: DegradationParameters): RequestQueuingParams {
  return {
    maxQueueSize: params.threshold,
    timeout: params.duration,
    priorityLevels: 3,
    timeoutMs: params.duration * 1000,
    priority: (params as any).priority
  };
}

export function convertToRedirectTrafficParams(params: DegradationParameters): RedirectTrafficParams {
  return {
    targetServer: (params as any).targetServer || (params as any).targetUrl || 'fallback.server',
    percentage: params.threshold,
    includePatterns: (params as any).includePatterns,
    excludePatterns: (params as any).excludePatterns,
    targetUrl: (params as any).targetUrl,
    preservePath: (params as any).preservePath,
    statusCode: (params as any).statusCode
  };
}

export function convertToIsolationParameters(params: Record<string, string | number | boolean>): IsolationParameters {
  return {
    isolatedServices: (Array.isArray(params.isolatedServices) ? params.isolatedServices : []) as string[],
    communicationMode: params.communicationMode as 'sync' | 'async' | 'disabled' || 'disabled',
    fallbackBehavior: params.fallbackBehavior as string || 'default',
    fallbackFunction: params.fallbackFunction
  };
}