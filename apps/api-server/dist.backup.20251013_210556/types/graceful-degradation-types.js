"use strict";
// Graceful degradation types
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToIsolationParameters = exports.convertToRedirectTrafficParams = exports.convertToRequestQueuingParams = exports.convertToRateLimitParams = exports.convertToSimplifiedUIParams = exports.convertToStaticContentParams = exports.convertToCacheFallbackParams = exports.convertToReduceFunctionalityParams = exports.convertToDisableFeatureParams = void 0;
// Type conversion helpers
function convertToDisableFeatureParams(params) {
    return {
        feature: params.feature || 'unknown',
        reason: params.reason || `Severity: ${params.severity}`,
        temporary: true,
        fallback: params.fallback
    };
}
exports.convertToDisableFeatureParams = convertToDisableFeatureParams;
function convertToReduceFunctionalityParams(params) {
    return {
        service: params.service || 'default',
        reductionLevel: params.threshold,
        preserveCore: params.severity !== 'critical',
        alternatives: params.alternatives,
        features: params.features,
        level: params.severity
    };
}
exports.convertToReduceFunctionalityParams = convertToReduceFunctionalityParams;
function convertToCacheFallbackParams(params) {
    return {
        enableStaleCache: true,
        maxStaleAge: params.duration,
        cacheOnly: params.severity === 'critical',
        cacheKey: params.cacheKey,
        ttl: params.ttl || params.duration,
        staleWhileRevalidate: params.staleWhileRevalidate,
        fallbackData: params.fallbackData
    };
}
exports.convertToCacheFallbackParams = convertToCacheFallbackParams;
function convertToStaticContentParams(params) {
    return {
        enableStaticMode: true,
        staticPages: params.staticPages || [],
        disableDynamic: params.severity === 'critical',
        contentPath: params.contentPath,
        expiryTime: params.expiryTime || params.duration
    };
}
exports.convertToStaticContentParams = convertToStaticContentParams;
function convertToSimplifiedUIParams(params) {
    return {
        removeFeatures: params.removeFeatures || [],
        simplifyLayout: true,
        disableAnimations: true,
        reducedMedia: params.severity !== 'low',
        removeAnimations: params.removeAnimations,
        disableImages: params.disableImages,
        minimalCSS: params.minimalCSS,
        essentialOnly: params.essentialOnly
    };
}
exports.convertToSimplifiedUIParams = convertToSimplifiedUIParams;
function convertToRateLimitParams(params) {
    return {
        requestsPerMinute: params.threshold,
        burstLimit: Math.ceil(params.threshold * 1.5),
        priorityUsers: params.priorityUsers,
        burstSize: params.burstSize,
        keyBy: params.keyBy
    };
}
exports.convertToRateLimitParams = convertToRateLimitParams;
function convertToRequestQueuingParams(params) {
    return {
        maxQueueSize: params.threshold,
        timeout: params.duration,
        priorityLevels: 3,
        timeoutMs: params.duration * 1000,
        priority: params.priority
    };
}
exports.convertToRequestQueuingParams = convertToRequestQueuingParams;
function convertToRedirectTrafficParams(params) {
    return {
        targetServer: params.targetServer || params.targetUrl || 'fallback.server',
        percentage: params.threshold,
        includePatterns: params.includePatterns,
        excludePatterns: params.excludePatterns,
        targetUrl: params.targetUrl,
        preservePath: params.preservePath,
        statusCode: params.statusCode
    };
}
exports.convertToRedirectTrafficParams = convertToRedirectTrafficParams;
function convertToIsolationParameters(params) {
    return {
        isolatedServices: (Array.isArray(params.isolatedServices) ? params.isolatedServices : []),
        communicationMode: params.communicationMode || 'disabled',
        fallbackBehavior: params.fallbackBehavior || 'default',
        fallbackFunction: params.fallbackFunction
    };
}
exports.convertToIsolationParameters = convertToIsolationParameters;
//# sourceMappingURL=graceful-degradation-types.js.map