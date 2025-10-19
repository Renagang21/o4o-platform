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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
                // Error log removed
            }
        });
        // Calculate and log statistics
        const avgResponseTime = metricsToWrite.reduce((sum, m) => sum + m.responseTime, 0) / metricsToWrite.length;
        const slowRequests = metricsToWrite.filter(m => m.responseTime > 1000);
        if (slowRequests.length > 0) {
            // Warning log removed
            slowRequests.forEach(req => {
                // Warning log removed
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
                    // Warning log removed
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
const middleware = exports.responseTimeMonitor.middleware();
exports.default = middleware;
//# sourceMappingURL=responseTimeMonitor.js.map