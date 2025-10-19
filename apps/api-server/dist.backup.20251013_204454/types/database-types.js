"use strict";
// Database optimization types
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeConnectionPoolStats = exports.normalizePerformanceThresholds = void 0;
// Helper function to convert legacy format to new format
function normalizePerformanceThresholds(thresholds) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        slowQueryTime: (_b = (_a = thresholds.slowQueryTime) !== null && _a !== void 0 ? _a : thresholds.slowQueryThreshold) !== null && _b !== void 0 ? _b : 1000,
        maxConnections: (_d = (_c = thresholds.maxConnections) !== null && _c !== void 0 ? _c : thresholds.highConnectionUsage) !== null && _d !== void 0 ? _d : 100,
        cacheHitRateThreshold: (_f = (_e = thresholds.cacheHitRateThreshold) !== null && _e !== void 0 ? _e : thresholds.lowCacheHitRate) !== null && _f !== void 0 ? _f : 0.8,
        indexUsageThreshold: (_g = thresholds.indexUsageThreshold) !== null && _g !== void 0 ? _g : 0.9,
        slowQueryThreshold: thresholds.slowQueryThreshold,
        verySlowQueryThreshold: thresholds.verySlowQueryThreshold,
        highConnectionUsage: thresholds.highConnectionUsage,
        lowCacheHitRate: thresholds.lowCacheHitRate,
        longRunningTransactionThreshold: thresholds.longRunningTransactionThreshold,
        tableAnalyzeThreshold: thresholds.tableAnalyzeThreshold,
        deadlockThreshold: thresholds.deadlockThreshold
    };
}
exports.normalizePerformanceThresholds = normalizePerformanceThresholds;
// Helper function to convert legacy format to new format
function normalizeConnectionPoolStats(stats) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return {
        total: (_b = (_a = stats.total) !== null && _a !== void 0 ? _a : stats.totalConnections) !== null && _b !== void 0 ? _b : 0,
        active: (_d = (_c = stats.active) !== null && _c !== void 0 ? _c : stats.activeConnections) !== null && _d !== void 0 ? _d : 0,
        idle: (_f = (_e = stats.idle) !== null && _e !== void 0 ? _e : stats.idleConnections) !== null && _f !== void 0 ? _f : 0,
        waiting: (_h = (_g = stats.waiting) !== null && _g !== void 0 ? _g : stats.waitingConnections) !== null && _h !== void 0 ? _h : 0,
        activeConnections: stats.activeConnections,
        idleConnections: stats.idleConnections,
        totalConnections: stats.totalConnections,
        waitingConnections: stats.waitingConnections,
        maxConnections: stats.maxConnections,
        acquiredConnections: stats.acquiredConnections,
        releasedConnections: stats.releasedConnections
    };
}
exports.normalizeConnectionPoolStats = normalizeConnectionPoolStats;
//# sourceMappingURL=database-types.js.map