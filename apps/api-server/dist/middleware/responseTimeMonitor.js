"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseTimeMonitor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ResponseTimeMonitor {
    constructor() {
        this.metrics = [];
        this.flushInterval = 10000; // 10 seconds
        this.metricsFile = path.join(process.cwd(), 'logs', 'response-metrics.json');
        this.startFlushTimer();
    }
    startFlushTimer() {
        setInterval(() => {
            this.flushMetrics();
        }, this.flushInterval);
    }
    flushMetrics() {
        if (this.metrics.length === 0)
            return;
        const metricsToWrite = [...this.metrics];
        this.metrics = [];
        // Append metrics to file
        fs.appendFile(this.metricsFile, metricsToWrite.map(m => JSON.stringify(m)).join('\n') + '\n', (err) => {
            if (err) {
                console.error('Failed to write metrics:', err);
            }
        });
        // Calculate and log statistics
        const avgResponseTime = metricsToWrite.reduce((sum, m) => sum + m.responseTime, 0) / metricsToWrite.length;
        const slowRequests = metricsToWrite.filter(m => m.responseTime > 1000);
        if (slowRequests.length > 0) {
            console.warn(`[MONITOR] ${slowRequests.length} slow requests detected (>1000ms)`);
            slowRequests.forEach(req => {
                console.warn(`[MONITOR] Slow: ${req.method} ${req.endpoint} - ${req.responseTime}ms`);
            });
        }
        // PM2 custom metrics
        if (process.send) {
            process.send({
                type: 'process:msg',
                data: {
                    type: 'custom_metrics',
                    avg_response_time: avgResponseTime,
                    slow_requests_count: slowRequests.length,
                    total_requests: metricsToWrite.length
                }
            });
        }
    }
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            // Store original end function
            const originalEnd = res.end;
            // Override end function
            res.end = function (...args) {
                const responseTime = Date.now() - startTime;
                // Record metrics
                const metric = {
                    endpoint: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    responseTime,
                    timestamp: new Date()
                };
                this.metrics.push(metric);
                // Log slow requests immediately
                if (responseTime > 1000) {
                    console.warn(`[SLOW REQUEST] ${req.method} ${req.path} took ${responseTime}ms`);
                }
                // Add response time header
                res.setHeader('X-Response-Time', `${responseTime}ms`);
                // Call original end
                originalEnd.apply(res, args);
            }.bind(this);
            next();
        };
    }
    getStats() {
        const last100 = this.metrics.slice(-100);
        if (last100.length === 0) {
            return {
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: 0,
                slowRequests: 0,
                totalRequests: 0
            };
        }
        const responseTimes = last100.map(m => m.responseTime);
        return {
            avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            maxResponseTime: Math.max(...responseTimes),
            minResponseTime: Math.min(...responseTimes),
            slowRequests: responseTimes.filter(t => t > 1000).length,
            totalRequests: last100.length
        };
    }
}
// Export singleton instance
exports.responseTimeMonitor = new ResponseTimeMonitor();
exports.default = exports.responseTimeMonitor.middleware();
//# sourceMappingURL=responseTimeMonitor.js.map