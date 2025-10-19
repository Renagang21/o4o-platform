"use strict";
/**
 * Prometheus Metrics Routes
 * Sprint 4: Expose metrics in Prometheus format
 *
 * Endpoint:
 * GET /metrics - Prometheus metrics endpoint (text format)
 *
 * Note: This endpoint should be protected in production
 * or exposed only to internal monitoring systems
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prometheus_metrics_service_1 = require("../services/prometheus-metrics.service");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * GET /metrics
 * Prometheus scrape endpoint
 *
 * Returns metrics in Prometheus text format:
 * # HELP metric_name Description
 * # TYPE metric_name gauge|counter|histogram
 * metric_name{label="value"} 123
 */
router.get('/', async (req, res) => {
    try {
        // Get metrics in Prometheus format
        const metrics = await prometheus_metrics_service_1.prometheusMetrics.getMetrics();
        // Set content type for Prometheus
        res.set('Content-Type', prometheus_metrics_service_1.prometheusMetrics.getContentType());
        res.send(metrics);
    }
    catch (error) {
        logger_1.default.error('Failed to generate Prometheus metrics', {
            error: error.message,
            stack: error.stack,
        });
        res.status(500).send('# Error generating metrics\n');
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map