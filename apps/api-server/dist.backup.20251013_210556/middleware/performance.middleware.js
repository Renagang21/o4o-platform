"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorAnalytics = exports.getPerformanceStats = exports.performanceMiddleware = void 0;
const connection_1 = require("../database/connection");
const logger_1 = __importDefault(require("../utils/logger"));
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    let responseSize = 0;
    let queryCount = 0;
    let cacheHit = false;
    // Override res.send to capture response size
    res.send = function (data) {
        responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        return originalSend.call(this, data);
    };
    // Override res.json to capture response size
    res.json = function (data) {
        responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        return originalJson.call(this, data);
    };
    // Track database queries
    const originalQuery = connection_1.AppDataSource.query;
    connection_1.AppDataSource.query = function (...args) {
        queryCount++;
        return originalQuery.apply(this, args);
    };
    // Set cache hit flag if present in headers
    res.on('finish', async () => {
        var _a, _b, _c;
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        cacheHit = res.get('X-Cache-Hit') === 'true';
        const requestSize = req.get('content-length')
            ? parseInt(req.get('content-length') || '0')
            : 0;
        const performanceLog = {
            endpoint: req.path,
            method: req.method,
            responseTime,
            statusCode: res.statusCode,
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            userRole: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role,
            queryCount,
            cacheHit,
            requestSize,
            responseSize,
        };
        // Add error message if response indicates error
        if (res.statusCode >= 400) {
            performanceLog.errorMessage = res.get('X-Error-Message') || 'Unknown error';
        }
        // Log performance metrics
        if (responseTime > 1000) {
            logger_1.default.warn('Slow request detected', {
                endpoint: req.path,
                method: req.method,
                responseTime,
                queryCount,
                userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id
            });
        }
        // Save to database asynchronously
        try {
            await connection_1.AppDataSource.query(`
        INSERT INTO system_performance_logs 
        (endpoint, method, "responseTime", "statusCode", "userId", "userRole", 
         "queryCount", "cacheHit", "errorMessage", "requestSize", "responseSize", "created_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
                performanceLog.endpoint,
                performanceLog.method,
                performanceLog.responseTime,
                performanceLog.statusCode,
                performanceLog.userId,
                performanceLog.userRole,
                performanceLog.queryCount,
                performanceLog.cacheHit,
                performanceLog.errorMessage,
                performanceLog.requestSize,
                performanceLog.responseSize
            ]);
        }
        catch (error) {
            logger_1.default.error('Failed to save performance log:', error);
        }
        // Restore original query method
        connection_1.AppDataSource.query = originalQuery;
    });
    next();
};
exports.performanceMiddleware = performanceMiddleware;
const getPerformanceStats = async (timeRange = 'day') => {
    let timeCondition = '';
    switch (timeRange) {
        case 'hour':
            timeCondition = "createdAt >= NOW() - INTERVAL '1 hour'";
            break;
        case 'day':
            timeCondition = "createdAt >= NOW() - INTERVAL '1 day'";
            break;
        case 'week':
            timeCondition = "createdAt >= NOW() - INTERVAL '7 days'";
            break;
    }
    const stats = await connection_1.AppDataSource.query(`
    SELECT 
      COUNT(*) as total_requests,
      AVG("responseTime") as avg_response_time,
      MAX("responseTime") as max_response_time,
      MIN("responseTime") as min_response_time,
      COUNT(*) FILTER (WHERE "statusCode" >= 400) as error_count,
      COUNT(*) FILTER (WHERE "statusCode" < 400) as success_count,
      AVG("queryCount") as avg_query_count,
      COUNT(*) FILTER (WHERE "cacheHit" = true) as cache_hits,
      COUNT(*) FILTER (WHERE "responseTime" > 1000) as slow_requests
    FROM system_performance_logs 
    WHERE ${timeCondition}
  `);
    const endpointStats = await connection_1.AppDataSource.query(`
    SELECT 
      endpoint,
      method,
      COUNT(*) as request_count,
      AVG("responseTime") as avg_response_time,
      COUNT(*) FILTER (WHERE "statusCode" >= 400) as error_count
    FROM system_performance_logs 
    WHERE ${timeCondition}
    GROUP BY endpoint, method
    ORDER BY avg_response_time DESC
    LIMIT 20
  `);
    return {
        summary: stats[0] || {},
        slowestEndpoints: endpointStats || []
    };
};
exports.getPerformanceStats = getPerformanceStats;
const getErrorAnalytics = async (timeRange = 'day') => {
    let timeCondition = '';
    switch (timeRange) {
        case 'hour':
            timeCondition = "createdAt >= NOW() - INTERVAL '1 hour'";
            break;
        case 'day':
            timeCondition = "createdAt >= NOW() - INTERVAL '1 day'";
            break;
        case 'week':
            timeCondition = "createdAt >= NOW() - INTERVAL '7 days'";
            break;
    }
    const errorStats = await connection_1.AppDataSource.query(`
    SELECT 
      "statusCode",
      COUNT(*) as error_count,
      endpoint,
      method,
      "errorMessage"
    FROM system_performance_logs 
    WHERE ${timeCondition} AND "statusCode" >= 400
    GROUP BY "statusCode", endpoint, method, "errorMessage"
    ORDER BY error_count DESC
    LIMIT 50
  `);
    const errorTrends = await connection_1.AppDataSource.query(`
    SELECT 
      DATE_TRUNC('hour', "created_at") as hour,
      COUNT(*) FILTER (WHERE "statusCode" >= 400) as error_count,
      COUNT(*) as total_requests
    FROM system_performance_logs 
    WHERE ${timeCondition}
    GROUP BY DATE_TRUNC('hour', "created_at")
    ORDER BY hour ASC
  `);
    return {
        errorsByType: errorStats || [],
        errorTrends: errorTrends || []
    };
};
exports.getErrorAnalytics = getErrorAnalytics;
//# sourceMappingURL=performance.middleware.js.map