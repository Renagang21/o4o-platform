"use strict";
/**
 * AI Proxy Routes
 * Sprint 2 - P1: Server-side LLM proxy
 *
 * Security:
 * - Authentication required (JWT)
 * - Rate limiting (per user)
 * - Request size limit (256KB)
 * - Model and parameter whitelist
 * - API keys never exposed to client
 *
 * Reliability:
 * - Timeout (15s default)
 * - Retry with exponential backoff
 * - Standardized error responses
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validateDto_1 = require("../middleware/validateDto");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const ai_proxy_service_1 = require("../services/ai-proxy.service");
const ai_job_queue_service_1 = require("../services/ai-job-queue.service");
const ai_metrics_service_1 = require("../services/ai-metrics.service");
const ai_dlq_service_1 = require("../services/ai-dlq.service");
const ai_usage_report_service_1 = require("../services/ai-usage-report.service");
const logger_1 = __importDefault(require("../utils/logger"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// AI Proxy rate limit (more restrictive than read endpoints)
const aiProxyRateLimit = (0, rateLimit_middleware_1.rateLimitMiddleware)({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per user
    message: 'AI generation rate limit exceeded. Please try again later.',
    keyGenerator: (req) => {
        var _a;
        const authReq = req;
        return `ai:proxy:${((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId) || req.ip || 'anonymous'}`;
    }
});
/**
 * POST /api/ai/generate
 * Server-side AI proxy endpoint
 * Accepts: { provider, model, systemPrompt, userPrompt, temperature?, maxTokens?, topP?, topK? }
 * Returns: { success, provider, model, usage, result, requestId }
 */
router.post('/generate', auth_middleware_1.authenticate, aiProxyRateLimit, (0, express_validator_1.body)('provider').isIn(['openai', 'gemini', 'claude']).withMessage('Invalid provider'), (0, express_validator_1.body)('model').isString().notEmpty().withMessage('Model is required'), (0, express_validator_1.body)('systemPrompt').isString().notEmpty().withMessage('System prompt is required'), (0, express_validator_1.body)('userPrompt').isString().notEmpty().withMessage('User prompt is required'), (0, express_validator_1.body)('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'), (0, express_validator_1.body)('maxTokens').optional().isInt({ min: 1 }).withMessage('Max tokens must be positive'), (0, express_validator_1.body)('topP').optional().isFloat({ min: 0, max: 1 }).withMessage('Top P must be between 0 and 1'), (0, express_validator_1.body)('topK').optional().isInt({ min: 1, max: 100 }).withMessage('Top K must be between 1 and 100'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c, _d, _e;
    const authReq = req;
    const requestId = (0, uuid_1.v4)();
    const startTime = Date.now();
    try {
        const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                type: 'AUTH_ERROR',
                retryable: false,
            });
        }
        const { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK, } = req.body;
        // Call AI proxy service
        const response = await ai_proxy_service_1.aiProxyService.generateContent({
            provider,
            model,
            systemPrompt,
            userPrompt,
            temperature,
            maxTokens,
            topP,
            topK,
        }, userId, requestId);
        const duration = Date.now() - startTime;
        // Operational logging
        // Note: validationResult is undefined here (validation happens on frontend)
        logger_1.default.info('AI proxy request completed', {
            requestId,
            userId,
            userEmail: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.email,
            provider,
            model,
            status: 'success',
            duration: `${duration}ms`,
            usage: response.usage,
            validationResult: undefined, // Sprint 2 - P2: validation logged separately
            timestamp: new Date().toISOString(),
        });
        res.json(response);
    }
    catch (error) {
        const duration = Date.now() - startTime;
        // Handle AIProxyError
        if (error.type) {
            const aiError = error;
            logger_1.default.error('AI proxy request failed', {
                requestId,
                userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
                userEmail: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.email,
                type: aiError.type,
                error: aiError.message,
                retryable: aiError.retryable,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString(),
            });
            // Set Retry-After header if provided
            if (aiError.retryAfter) {
                res.setHeader('Retry-After', aiError.retryAfter.toString());
            }
            // Determine status code
            let statusCode = 500;
            if (aiError.type === 'VALIDATION_ERROR')
                statusCode = 400;
            if (aiError.type === 'AUTH_ERROR')
                statusCode = 401;
            if (aiError.type === 'RATE_LIMIT_ERROR')
                statusCode = 429;
            if (aiError.type === 'TIMEOUT_ERROR')
                statusCode = 504;
            return res.status(statusCode).json({
                success: false,
                error: aiError.message,
                type: aiError.type,
                retryable: aiError.retryable,
                requestId,
            });
        }
        // Handle unexpected errors
        logger_1.default.error('AI proxy unexpected error', {
            requestId,
            userId: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.userId,
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            type: 'PROVIDER_ERROR',
            retryable: false,
            requestId,
        });
    }
});
/**
 * POST /api/ai/generate/async
 * Sprint 2 - P2: Async AI generation with BullMQ
 * Enqueues job and returns jobId for status tracking
 */
router.post('/generate/async', auth_middleware_1.authenticate, aiProxyRateLimit, (0, express_validator_1.body)('provider').isIn(['openai', 'gemini', 'claude']).withMessage('Invalid provider'), (0, express_validator_1.body)('model').isString().notEmpty().withMessage('Model is required'), (0, express_validator_1.body)('systemPrompt').isString().notEmpty().withMessage('System prompt is required'), (0, express_validator_1.body)('userPrompt').isString().notEmpty().withMessage('User prompt is required'), (0, express_validator_1.body)('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'), (0, express_validator_1.body)('maxTokens').optional().isInt({ min: 1 }).withMessage('Max tokens must be positive'), (0, express_validator_1.body)('topP').optional().isFloat({ min: 0, max: 1 }).withMessage('Top P must be between 0 and 1'), (0, express_validator_1.body)('topK').optional().isInt({ min: 1, max: 100 }).withMessage('Top K must be between 1 and 100'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c;
    const authReq = req;
    const requestId = (0, uuid_1.v4)();
    try {
        const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
        const userEmail = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.email;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
        }
        const { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK, } = req.body;
        // Prepare job data
        const jobData = {
            provider,
            model,
            systemPrompt,
            userPrompt,
            temperature,
            maxTokens,
            topP,
            topK,
            userId,
            userEmail,
            requestId,
        };
        // Enqueue job
        const jobId = await ai_job_queue_service_1.aiJobQueue.enqueueJob(jobData);
        logger_1.default.info('AI job enqueued via API', {
            jobId,
            userId,
            userEmail,
            provider,
            model,
            requestId,
        });
        // Return jobId
        res.status(202).json({
            success: true,
            jobId,
            requestId,
            status: 'queued',
            message: 'Job enqueued successfully. Use /api/ai/jobs/:jobId to check status.',
        });
    }
    catch (error) {
        logger_1.default.error('Failed to enqueue AI job', {
            error: error.message,
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
            requestId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to enqueue job',
            requestId,
        });
    }
});
/**
 * GET /api/ai/jobs/:jobId
 * Sprint 2 - P2: Get job status
 */
router.get('/jobs/:jobId', auth_middleware_1.authenticate, (0, express_validator_1.param)('jobId').isString().notEmpty().withMessage('Job ID is required'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c;
    const authReq = req;
    const { jobId } = req.params;
    try {
        const status = await ai_job_queue_service_1.aiJobQueue.getJobStatus(jobId);
        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        // Verify user owns this job
        if (((_a = status.data) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        res.json({
            success: true,
            job: status,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get job status', {
            jobId,
            error: error.message,
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get job status',
        });
    }
});
/**
 * DELETE /api/ai/jobs/:jobId
 * Sprint 2 - P2: Cancel job
 */
router.delete('/jobs/:jobId', auth_middleware_1.authenticate, (0, express_validator_1.param)('jobId').isString().notEmpty().withMessage('Job ID is required'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c, _d;
    const authReq = req;
    const { jobId } = req.params;
    try {
        // Get job to verify ownership
        const status = await ai_job_queue_service_1.aiJobQueue.getJobStatus(jobId);
        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        // Verify user owns this job
        if (((_a = status.data) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        // Cancel job
        const cancelled = await ai_job_queue_service_1.aiJobQueue.cancelJob(jobId);
        if (!cancelled) {
            return res.status(400).json({
                success: false,
                error: 'Failed to cancel job (may already be completed)',
            });
        }
        logger_1.default.info('AI job cancelled via API', {
            jobId,
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
        });
        res.json({
            success: true,
            message: 'Job cancelled successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Failed to cancel job', {
            jobId,
            error: error.message,
            userId: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to cancel job',
        });
    }
});
/**
 * GET /api/ai/stream/:jobId
 * Sprint 2 - P2: SSE streaming for job progress
 */
router.get('/stream/:jobId', auth_middleware_1.authenticate, (0, express_validator_1.param)('jobId').isString().notEmpty().withMessage('Job ID is required'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c;
    const authReq = req;
    const { jobId } = req.params;
    try {
        // Get job to verify ownership
        const status = await ai_job_queue_service_1.aiJobQueue.getJobStatus(jobId);
        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        // Verify user owns this job
        if (((_a = status.data) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);
        // Get queue events
        const queueEvents = ai_job_queue_service_1.aiJobQueue.getQueueEvents();
        // Listen for progress updates
        const onProgress = async (data) => {
            if (data.jobId === jobId) {
                res.write(`data: ${JSON.stringify({ type: 'progress', progress: data.data })}\n\n`);
            }
        };
        // Listen for completion
        const onCompleted = async (data) => {
            if (data.jobId === jobId) {
                res.write(`data: ${JSON.stringify({ type: 'completed', result: data.returnvalue })}\n\n`);
                res.end();
            }
        };
        // Listen for failure
        const onFailed = async (data) => {
            if (data.jobId === jobId) {
                res.write(`data: ${JSON.stringify({ type: 'failed', error: data.failedReason })}\n\n`);
                res.end();
            }
        };
        queueEvents.on('progress', onProgress);
        queueEvents.on('completed', onCompleted);
        queueEvents.on('failed', onFailed);
        // Handle client disconnect
        req.on('close', () => {
            queueEvents.off('progress', onProgress);
            queueEvents.off('completed', onCompleted);
            queueEvents.off('failed', onFailed);
            res.end();
        });
        // Send periodic heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
            res.write(`: heartbeat\n\n`);
        }, 30000); // Every 30 seconds
        req.on('close', () => {
            clearInterval(heartbeat);
        });
    }
    catch (error) {
        logger_1.default.error('SSE streaming error', {
            jobId,
            error: error.message,
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
        });
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Failed to establish SSE connection',
            });
        }
    }
});
/**
 * GET /api/ai/generate/models
 * Get list of allowed models per provider
 */
router.get('/models', auth_middleware_1.authenticate, async (req, res) => {
    const { MODEL_WHITELIST, PARAMETER_LIMITS } = await Promise.resolve().then(() => __importStar(require('../types/ai-proxy.types')));
    res.json({
        success: true,
        data: {
            models: MODEL_WHITELIST,
            limits: PARAMETER_LIMITS,
        },
    });
});
/**
 * GET /api/ai/jobs/metrics
 * Sprint 3: Observability - Get AI job metrics and statistics
 * Returns: success rate, processing time, retry counts, validation rates, queue status
 */
router.get('/jobs/metrics', auth_middleware_1.authenticate, async (req, res) => {
    var _a, _b;
    const authReq = req;
    try {
        // Get time range from query (default: last 24 hours)
        const timeRangeHours = parseInt(req.query.hours) || 24;
        const timeRangeMs = timeRangeHours * 60 * 60 * 1000;
        const metrics = await ai_metrics_service_1.aiMetrics.collectMetrics(timeRangeMs);
        logger_1.default.info('AI metrics collected', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            timeRangeHours,
            totalJobs: metrics.totalJobs,
        });
        res.json({
            success: true,
            data: metrics,
            meta: {
                timeRangeHours,
                collectedAt: metrics.collectedAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to collect AI metrics', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to collect metrics',
            message: error.message,
        });
    }
});
/**
 * GET /api/ai/jobs/history
 * Sprint 3: Get recent job history
 */
router.get('/jobs/history', auth_middleware_1.authenticate, async (req, res) => {
    var _a;
    const authReq = req;
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await ai_metrics_service_1.aiMetrics.getRecentJobs(limit);
        res.json({
            success: true,
            data: {
                jobs: history,
                total: history.length,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get job history', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get job history',
        });
    }
});
/**
 * POST /api/ai/jobs/:jobId/retry
 * Sprint 3: Re-run a job with same configuration
 * Links original job to re-run job via relatedJobId
 */
router.post('/jobs/:jobId/retry', auth_middleware_1.authenticate, (0, express_validator_1.param)('jobId').isString().notEmpty().withMessage('Job ID is required'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c, _d;
    const authReq = req;
    const { jobId } = req.params;
    const newRequestId = (0, uuid_1.v4)();
    try {
        // Get original job
        const originalJob = await ai_job_queue_service_1.aiJobQueue.getJobStatus(jobId);
        if (!originalJob) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        // Verify user owns this job
        if (((_a = originalJob.data) === null || _a === void 0 ? void 0 : _a.userId) !== ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        // Prepare job data with same configuration
        const jobData = {
            ...originalJob.data,
            requestId: newRequestId,
            // Note: Keep same userId, provider, model, prompts, parameters
        };
        // Enqueue new job
        const newJobId = await ai_job_queue_service_1.aiJobQueue.enqueueJob(jobData);
        logger_1.default.info('AI job re-run enqueued', {
            originalJobId: jobId,
            newJobId,
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
            provider: jobData.provider,
            model: jobData.model,
            rerun: true,
        });
        res.json({
            success: true,
            data: {
                jobId: newJobId,
                requestId: newRequestId,
                originalJobId: jobId,
                relatedJobId: jobId,
                status: 'queued',
                rerun: true,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to re-run job', {
            jobId,
            userId: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to re-run job',
            message: error.message,
        });
    }
});
/**
 * GET /api/ai/dlq
 * Sprint 4: Get Dead Letter Queue entries
 */
router.get('/dlq', auth_middleware_1.authenticate, async (req, res) => {
    var _a;
    const authReq = req;
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const entries = await ai_dlq_service_1.aiDLQ.getDLQEntries(limit, offset);
        res.json({
            success: true,
            data: {
                entries,
                total: entries.length,
                limit,
                offset,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get DLQ entries', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get DLQ entries',
        });
    }
});
/**
 * GET /api/ai/dlq/stats
 * Sprint 4: Get DLQ statistics
 */
router.get('/dlq/stats', auth_middleware_1.authenticate, async (req, res) => {
    var _a;
    const authReq = req;
    try {
        const stats = await ai_dlq_service_1.aiDLQ.getDLQStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get DLQ stats', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get DLQ stats',
        });
    }
});
/**
 * POST /api/ai/dlq/:dlqJobId/retry
 * Sprint 4: Retry job from DLQ
 */
router.post('/dlq/:dlqJobId/retry', auth_middleware_1.authenticate, (0, express_validator_1.param)('dlqJobId').isString().notEmpty().withMessage('DLQ Job ID is required'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b;
    const authReq = req;
    const { dlqJobId } = req.params;
    try {
        const newJobId = await ai_dlq_service_1.aiDLQ.retryFromDLQ(dlqJobId, ai_job_queue_service_1.aiJobQueue.getQueue());
        if (!newJobId) {
            return res.status(400).json({
                success: false,
                error: 'Failed to retry job from DLQ (job not found or not retryable)',
            });
        }
        logger_1.default.info('Job retried from DLQ', {
            dlqJobId,
            newJobId,
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
        });
        res.json({
            success: true,
            data: {
                newJobId,
                status: 'queued',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Failed to retry job from DLQ', {
            dlqJobId,
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to retry job from DLQ',
        });
    }
});
/**
 * Sprint 4: Usage Report Endpoints
 */
/**
 * GET /api/ai/usage/report
 * Generate usage report for a time period
 *
 * Query params:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 * - userId: Optional user filter
 * - provider: Optional provider filter
 * - model: Optional model filter
 * - topUsersLimit: Optional limit for top users (default: 10)
 * - format: 'json' | 'csv' (default: 'json')
 */
router.get('/usage/report', auth_middleware_1.authenticate, async (req, res) => {
    var _a, _b;
    const authReq = req;
    try {
        // Parse query parameters
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const options = {
            userId: req.query.userId,
            provider: req.query.provider,
            model: req.query.model,
            topUsersLimit: req.query.topUsersLimit
                ? parseInt(req.query.topUsersLimit)
                : 10,
        };
        const format = req.query.format || 'json';
        // Generate report
        const report = await ai_usage_report_service_1.aiUsageReport.generateReport(startDate, endDate, options);
        // Return based on format
        if (format === 'csv') {
            const csv = ai_usage_report_service_1.aiUsageReport.exportAsCSV(report);
            res.set('Content-Type', 'text/csv');
            res.set('Content-Disposition', `attachment; filename="ai-usage-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        }
        else {
            res.json({
                success: true,
                data: report,
            });
        }
        logger_1.default.info('Usage report generated', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            format,
            totalJobs: report.totalJobs,
            totalCost: report.totalEstimatedCost,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to generate usage report', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to generate usage report',
        });
    }
});
/**
 * GET /api/ai/usage/current-month
 * Get current month usage report
 */
router.get('/usage/current-month', auth_middleware_1.authenticate, async (req, res) => {
    var _a, _b;
    const authReq = req;
    try {
        const report = await ai_usage_report_service_1.aiUsageReport.getCurrentMonthReport();
        res.json({
            success: true,
            data: report,
        });
        logger_1.default.info('Current month usage report generated', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            totalJobs: report.totalJobs,
            totalCost: report.totalEstimatedCost,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to generate current month report', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to generate current month report',
        });
    }
});
/**
 * GET /api/ai/usage/last-n-days
 * Get last N days usage report
 *
 * Query params:
 * - days: Number of days (default: 7)
 */
router.get('/usage/last-n-days', auth_middleware_1.authenticate, async (req, res) => {
    var _a, _b;
    const authReq = req;
    try {
        const days = req.query.days ? parseInt(req.query.days) : 7;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const report = await ai_usage_report_service_1.aiUsageReport.getLastNDaysReport(days);
        res.json({
            success: true,
            data: report,
        });
        logger_1.default.info('Last N days usage report generated', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            days,
            totalJobs: report.totalJobs,
            totalCost: report.totalEstimatedCost,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to generate last N days report', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to generate last N days report',
        });
    }
});
exports.default = router;
//# sourceMappingURL=ai-proxy.js.map