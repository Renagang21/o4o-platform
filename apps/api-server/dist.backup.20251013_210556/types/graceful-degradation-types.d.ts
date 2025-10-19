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
export declare function convertToDisableFeatureParams(params: DegradationParameters): DisableFeatureParams;
export declare function convertToReduceFunctionalityParams(params: DegradationParameters): ReduceFunctionalityParams;
export declare function convertToCacheFallbackParams(params: DegradationParameters): CacheFallbackParams;
export declare function convertToStaticContentParams(params: DegradationParameters): StaticContentParams;
export declare function convertToSimplifiedUIParams(params: DegradationParameters): SimplifiedUIParams;
export declare function convertToRateLimitParams(params: DegradationParameters): RateLimitParams;
export declare function convertToRequestQueuingParams(params: DegradationParameters): RequestQueuingParams;
export declare function convertToRedirectTrafficParams(params: DegradationParameters): RedirectTrafficParams;
export declare function convertToIsolationParameters(params: Record<string, string | number | boolean>): IsolationParameters;
//# sourceMappingURL=graceful-degradation-types.d.ts.map