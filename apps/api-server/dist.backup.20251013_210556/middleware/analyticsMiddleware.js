"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsMiddleware = exports.AnalyticsMiddleware = void 0;
const AnalyticsService_1 = require("../services/AnalyticsService");
const UserAction_1 = require("../entities/UserAction");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const uuid_1 = require("uuid");
class AnalyticsMiddleware {
    constructor() {
        this.analyticsService = new AnalyticsService_1.AnalyticsService();
    }
    // Initialize analytics tracking for each request
    initializeTracking() {
        return async (req, res, next) => {
            var _a, _b;
            const startTime = Date.now();
            const sessionId = req.headers['x-session-id'] || (0, uuid_1.v4)();
            const betaUserId = req.headers['x-beta-user-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.betaUserId);
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const ipAddress = req.ip || ((_b = req.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) || 'Unknown';
            req.analytics = {
                sessionId,
                startTime,
                betaUserId,
                userAgent,
                ipAddress
            };
            // Track API call
            if (betaUserId) {
                try {
                    await this.analyticsService.trackAction({
                        betaUserId,
                        sessionId,
                        actionType: UserAction_1.ActionType.API_CALL,
                        actionName: `API: ${req.method} ${req.path}`,
                        pageUrl: req.originalUrl,
                        metadata: {
                            method: req.method,
                            path: req.path,
                            query: req.query,
                            userAgent,
                            ipAddress
                        }
                    });
                }
                catch (error) {
                    // Error log removed
                }
            }
            next();
        };
    }
    // Track request performance and completion
    trackPerformance() {
        return async (req, res, next) => {
            const originalSend = res.send;
            const originalJson = res.json;
            const analyticsService = this.analyticsService;
            res.send = function (data) {
                var _a;
                res.send = originalSend;
                const responseTime = Date.now() - (((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.startTime) || 0);
                // Track performance metric
                setImmediate(async () => {
                    var _a;
                    try {
                        await analyticsService.recordPerformanceMetric(req.originalUrl, responseTime, 'api-server');
                        // Track errors if response indicates failure
                        if (res.statusCode >= 400 && ((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                            await analyticsService.trackError(req.analytics.betaUserId, req.analytics.sessionId, {
                                message: `HTTP ${res.statusCode}: ${req.method} ${req.originalUrl}`,
                                code: res.statusCode.toString(),
                                pageUrl: req.originalUrl
                            });
                        }
                    }
                    catch (error) {
                        // Error log removed
                    }
                });
                return originalSend.call(res, data);
            };
            res.json = function (data) {
                var _a;
                res.json = originalJson;
                const responseTime = Date.now() - (((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.startTime) || 0);
                // Track performance metric
                setImmediate(async () => {
                    var _a;
                    try {
                        await analyticsService.recordPerformanceMetric(req.originalUrl, responseTime, 'api-server');
                        // Track errors if response indicates failure
                        if (res.statusCode >= 400 && ((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                            await analyticsService.trackError(req.analytics.betaUserId, req.analytics.sessionId, {
                                message: `HTTP ${res.statusCode}: ${req.method} ${req.originalUrl}`,
                                code: res.statusCode.toString(),
                                pageUrl: req.originalUrl
                            });
                        }
                    }
                    catch (error) {
                        // Error log removed
                    }
                });
                return originalJson.call(res, data);
            };
            next();
        };
    }
    // Track specific actions based on endpoint patterns
    trackActions() {
        return async (req, res, next) => {
            var _a;
            if (!((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                return next();
            }
            try {
                const actionType = this.getActionTypeFromRequest(req);
                const actionName = this.getActionNameFromRequest(req);
                if (actionType && actionName) {
                    await this.analyticsService.trackAction({
                        betaUserId: req.analytics.betaUserId,
                        sessionId: req.analytics.sessionId,
                        actionType,
                        actionName,
                        pageUrl: req.originalUrl,
                        metadata: {
                            method: req.method,
                            body: req.body,
                            params: req.params,
                            query: req.query
                        }
                    });
                }
            }
            catch (error) {
                // Error log removed
            }
            next();
        };
    }
    // Track errors and exceptions
    trackErrors() {
        return async (err, req, res, next) => {
            var _a;
            if ((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId) {
                try {
                    await this.analyticsService.trackError(req.analytics.betaUserId, req.analytics.sessionId, {
                        message: err.message,
                        pageUrl: req.originalUrl,
                        stackTrace: err.stack
                    });
                    // Record error metric
                    await this.analyticsService.recordMetric({
                        metricType: SystemMetrics_1.MetricType.ERROR,
                        metricCategory: SystemMetrics_1.MetricCategory.ERROR_COUNT,
                        metricName: 'API Error',
                        value: 1,
                        unit: 'count',
                        source: 'api-server',
                        endpoint: req.originalUrl,
                        metadata: {
                            errorMessage: err.message,
                            errorType: err.constructor.name,
                            stackTrace: err.stack
                        }
                    });
                }
                catch (trackingError) {
                    // Error log removed
                }
            }
            next(err);
        };
    }
    // Session management middleware
    manageSession() {
        return async (req, res, next) => {
            var _a;
            if (!((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                return next();
            }
            try {
                const existingSession = await this.analyticsService.updateSession(req.analytics.sessionId, { lastActivityAt: new Date() });
                if (!existingSession) {
                    // Create new session
                    await this.analyticsService.createSession({
                        betaUserId: req.analytics.betaUserId,
                        sessionId: req.analytics.sessionId,
                        ipAddress: req.analytics.ipAddress,
                        userAgent: req.analytics.userAgent,
                        referrer: req.headers.referer,
                        utmSource: req.query.utm_source,
                        utmMedium: req.query.utm_medium,
                        utmCampaign: req.query.utm_campaign
                    });
                }
            }
            catch (error) {
                // Error log removed
            }
            next();
        };
    }
    // Custom tracking methods for specific use cases
    trackLogin() {
        return async (req, res, next) => {
            const originalSend = res.send;
            const originalJson = res.json;
            const trackLoginSuccess = async () => {
                var _a;
                if (res.statusCode === 200 && ((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                    try {
                        await this.analyticsService.trackAction({
                            betaUserId: req.analytics.betaUserId,
                            sessionId: req.analytics.sessionId,
                            actionType: UserAction_1.ActionType.LOGIN,
                            actionName: 'User Login',
                            pageUrl: req.originalUrl,
                            metadata: {
                                userAgent: req.analytics.userAgent,
                                ipAddress: req.analytics.ipAddress
                            }
                        });
                    }
                    catch (error) {
                        // Error log removed
                    }
                }
            };
            res.send = function (data) {
                res.send = originalSend;
                setImmediate(trackLoginSuccess);
                return originalSend.call(res, data);
            };
            res.json = function (data) {
                res.json = originalJson;
                setImmediate(trackLoginSuccess);
                return originalJson.call(res, data);
            };
            next();
        };
    }
    trackFeedback() {
        return async (req, res, next) => {
            const originalSend = res.send;
            const originalJson = res.json;
            const trackFeedbackSuccess = async () => {
                var _a;
                if (res.statusCode === 201 && ((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                    try {
                        await this.analyticsService.trackAction({
                            betaUserId: req.analytics.betaUserId,
                            sessionId: req.analytics.sessionId,
                            actionType: UserAction_1.ActionType.FEEDBACK_SUBMIT,
                            actionName: 'Feedback Submitted',
                            pageUrl: req.originalUrl,
                            metadata: {
                                feedbackType: req.body.type,
                                category: req.body.category,
                                rating: req.body.rating
                            }
                        });
                        // Update session feedback count
                        await this.analyticsService.updateSession(req.analytics.sessionId, {
                            feedbackSubmitted: 1
                        });
                    }
                    catch (error) {
                        // Error log removed
                    }
                }
            };
            res.send = function (data) {
                res.send = originalSend;
                setImmediate(trackFeedbackSuccess);
                return originalSend.call(res, data);
            };
            res.json = function (data) {
                res.json = originalJson;
                setImmediate(trackFeedbackSuccess);
                return originalJson.call(res, data);
            };
            next();
        };
    }
    trackContentUsage() {
        return async (req, res, next) => {
            const originalSend = res.send;
            const originalJson = res.json;
            const trackContentSuccess = async () => {
                var _a;
                if (res.statusCode === 200 && ((_a = req.analytics) === null || _a === void 0 ? void 0 : _a.betaUserId)) {
                    try {
                        const actionType = this.getContentActionType(req);
                        if (actionType) {
                            await this.analyticsService.trackAction({
                                betaUserId: req.analytics.betaUserId,
                                sessionId: req.analytics.sessionId,
                                actionType,
                                actionName: `Content ${actionType.replace('_', ' ')}`,
                                pageUrl: req.originalUrl,
                                metadata: {
                                    contentId: req.params.id,
                                    contentType: req.body.type,
                                    action: req.method
                                }
                            });
                            // Update session content viewed count
                            await this.analyticsService.updateSession(req.analytics.sessionId, {
                                contentViewed: 1
                            });
                        }
                    }
                    catch (error) {
                        // Error log removed
                    }
                }
            };
            res.send = function (data) {
                res.send = originalSend;
                setImmediate(trackContentSuccess);
                return originalSend.call(res, data);
            };
            res.json = function (data) {
                res.json = originalJson;
                setImmediate(trackContentSuccess);
                return originalJson.call(res, data);
            };
            next();
        };
    }
    // Helper methods
    getActionTypeFromRequest(req) {
        const path = req.path.toLowerCase();
        const method = req.method.toLowerCase();
        // Login/logout actions
        if (path.includes('/login'))
            return UserAction_1.ActionType.LOGIN;
        if (path.includes('/logout'))
            return UserAction_1.ActionType.LOGOUT;
        // Content actions
        if (path.includes('/content') || path.includes('/signage')) {
            if (method === 'get')
                return UserAction_1.ActionType.CONTENT_VIEW;
            if (method === 'post')
                return UserAction_1.ActionType.SIGNAGE_CREATE;
            if (method === 'put')
                return UserAction_1.ActionType.SIGNAGE_EDIT;
            if (method === 'delete')
                return UserAction_1.ActionType.SIGNAGE_DELETE;
        }
        // Playlist actions
        if (path.includes('/playlist')) {
            if (method === 'post')
                return UserAction_1.ActionType.PLAYLIST_CREATE;
            if (method === 'put')
                return UserAction_1.ActionType.PLAYLIST_EDIT;
        }
        // Feedback actions
        if (path.includes('/feedback')) {
            if (method === 'post')
                return UserAction_1.ActionType.FEEDBACK_SUBMIT;
            if (method === 'put')
                return UserAction_1.ActionType.FEEDBACK_RATE;
        }
        // Admin actions
        if (path.includes('/admin')) {
            if (path.includes('/approve'))
                return UserAction_1.ActionType.USER_APPROVE;
            if (path.includes('/analytics'))
                return UserAction_1.ActionType.ANALYTICS_VIEW;
            if (path.includes('/reports'))
                return UserAction_1.ActionType.REPORT_GENERATE;
        }
        return null;
    }
    getActionNameFromRequest(req) {
        const actionType = this.getActionTypeFromRequest(req);
        if (!actionType)
            return `${req.method} ${req.path}`;
        return actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    getContentActionType(req) {
        const path = req.path.toLowerCase();
        const method = req.method.toLowerCase();
        if (path.includes('/content') && method === 'get')
            return UserAction_1.ActionType.CONTENT_VIEW;
        if (path.includes('/signage') && method === 'post')
            return UserAction_1.ActionType.SIGNAGE_CREATE;
        if (path.includes('/signage') && method === 'put')
            return UserAction_1.ActionType.SIGNAGE_EDIT;
        if (path.includes('/playlist') && method === 'post')
            return UserAction_1.ActionType.PLAYLIST_CREATE;
        if (path.includes('/schedule') && method === 'post')
            return UserAction_1.ActionType.SIGNAGE_SCHEDULE;
        if (path.includes('/template') && method === 'post')
            return UserAction_1.ActionType.TEMPLATE_USE;
        return null;
    }
}
exports.AnalyticsMiddleware = AnalyticsMiddleware;
// Export singleton instance
exports.analyticsMiddleware = new AnalyticsMiddleware();
//# sourceMappingURL=analyticsMiddleware.js.map