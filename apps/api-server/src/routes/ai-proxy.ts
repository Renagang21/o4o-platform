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

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validateDto } from '../middleware/validateDto.js';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import { aiProxyService } from '../services/ai-proxy.service.js';
import { aiJobQueue } from '../services/ai-job-queue.service.js';
import { aiMetrics } from '../services/ai-metrics.service.js';
import { aiDLQ } from '../services/ai-dlq.service.js';
import { aiUsageReport } from '../services/ai-usage-report.service.js';
import { aiBlockWriter } from '../services/ai-block-writer.service.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { AIProxyError } from '../types/ai-proxy.types.js';
import { AIJobData } from '../types/ai-job.types.js';

const router: Router = Router();

// AI Proxy rate limit (more restrictive than read endpoints)
const aiProxyRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per user
  message: 'AI generation rate limit exceeded. Please try again later.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return `ai:proxy:${authReq.user?.id || req.ip || 'anonymous'}`;
  }
});

/**
 * POST /api/ai/generate
 * Server-side AI proxy endpoint
 * Accepts: { provider, model, systemPrompt, userPrompt, temperature?, maxTokens?, topP?, topK? }
 * Returns: { success, provider, model, usage, result, requestId }
 */
router.post('/generate',
  authenticate,
  aiProxyRateLimit,
  body('provider').isIn(['openai', 'gemini', 'claude']).withMessage('Invalid provider'),
  body('model').isString().notEmpty().withMessage('Model is required'),
  body('systemPrompt').isString().notEmpty().withMessage('System prompt is required'),
  body('userPrompt').isString().notEmpty().withMessage('User prompt is required'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
  body('maxTokens').optional().isInt({ min: 1 }).withMessage('Max tokens must be positive'),
  body('topP').optional().isFloat({ min: 0, max: 1 }).withMessage('Top P must be between 0 and 1'),
  body('topK').optional().isInt({ min: 1, max: 100 }).withMessage('Top K must be between 1 and 100'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          type: 'AUTH_ERROR',
          retryable: false,
        });
      }

      const {
        provider,
        model,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
        topP,
        topK,
      } = req.body;

      // Call AI proxy service
      const response = await aiProxyService.generateContent(
        {
          provider,
          model,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          topP,
          topK,
        },
        userId,
        requestId
      );

      const duration = Date.now() - startTime;

      // Operational logging
      // Note: validationResult is undefined here (validation happens on frontend)
      logger.info('AI proxy request completed', {
        requestId,
        userId,
        userEmail: authReq.user?.email,
        provider,
        model,
        status: 'success',
        duration: `${duration}ms`,
        usage: response.usage,
        validationResult: undefined, // Sprint 2 - P2: validation logged separately
        timestamp: new Date().toISOString(),
      });

      res.json(response);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Handle AIProxyError
      if (error.type) {
        const aiError = error as AIProxyError;

        logger.error('AI proxy request failed', {
          requestId,
          userId: authReq.user?.id,
          userEmail: authReq.user?.email,
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
        if (aiError.type === 'VALIDATION_ERROR') statusCode = 400;
        if (aiError.type === 'AUTH_ERROR') statusCode = 401;
        if (aiError.type === 'RATE_LIMIT_ERROR') statusCode = 429;
        if (aiError.type === 'TIMEOUT_ERROR') statusCode = 504;

        return res.status(statusCode).json({
          success: false,
          error: aiError.message,
          type: aiError.type,
          retryable: aiError.retryable,
          requestId,
        });
      }

      // Handle unexpected errors
      logger.error('AI proxy unexpected error', {
        requestId,
        userId: authReq.user?.id,
        error: error.message,
        errorName: error.name,
        errorType: typeof error,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
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
  }
);

/**
 * POST /api/ai/generate/async
 * Sprint 2 - P2: Async AI generation with BullMQ
 * Enqueues job and returns jobId for status tracking
 */
router.post('/generate/async',
  authenticate,
  aiProxyRateLimit,
  body('provider').isIn(['openai', 'gemini', 'claude']).withMessage('Invalid provider'),
  body('model').isString().notEmpty().withMessage('Model is required'),
  body('systemPrompt').isString().notEmpty().withMessage('System prompt is required'),
  body('userPrompt').isString().notEmpty().withMessage('User prompt is required'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
  body('maxTokens').optional().isInt({ min: 1 }).withMessage('Max tokens must be positive'),
  body('topP').optional().isFloat({ min: 0, max: 1 }).withMessage('Top P must be between 0 and 1'),
  body('topK').optional().isInt({ min: 1, max: 100 }).withMessage('Top K must be between 1 and 100'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const requestId = uuidv4();

    try {
      const userId = authReq.user?.id;
      const userEmail = authReq.user?.email;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const {
        provider,
        model,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
        topP,
        topK,
      } = req.body;

      // Prepare job data
      const jobData: AIJobData = {
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
      const jobId = await aiJobQueue.enqueueJob(jobData);

      logger.info('AI job enqueued via API', {
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

    } catch (error: any) {
      logger.error('Failed to enqueue AI job', {
        error: error.message,
        userId: authReq.user?.id,
        requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to enqueue job',
        requestId,
      });
    }
  }
);

/**
 * GET /api/ai/jobs/:jobId
 * Sprint 2 - P2: Get job status
 */
router.get('/jobs/:jobId',
  authenticate,
  param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { jobId } = req.params;

    try {
      const status = await aiJobQueue.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Verify user owns this job
      if (status.data?.userId !== authReq.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        job: status,
      });

    } catch (error: any) {
      logger.error('Failed to get job status', {
        jobId,
        error: error.message,
        userId: authReq.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
      });
    }
  }
);

/**
 * DELETE /api/ai/jobs/:jobId
 * Sprint 2 - P2: Cancel job
 */
router.delete('/jobs/:jobId',
  authenticate,
  param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { jobId } = req.params;

    try {
      // Get job to verify ownership
      const status = await aiJobQueue.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Verify user owns this job
      if (status.data?.userId !== authReq.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Cancel job
      const cancelled = await aiJobQueue.cancelJob(jobId);

      if (!cancelled) {
        return res.status(400).json({
          success: false,
          error: 'Failed to cancel job (may already be completed)',
        });
      }

      logger.info('AI job cancelled via API', {
        jobId,
        userId: authReq.user?.id,
      });

      res.json({
        success: true,
        message: 'Job cancelled successfully',
      });

    } catch (error: any) {
      logger.error('Failed to cancel job', {
        jobId,
        error: error.message,
        userId: authReq.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
      });
    }
  }
);

/**
 * GET /api/ai/stream/:jobId
 * Sprint 2 - P2: SSE streaming for job progress
 */
router.get('/stream/:jobId',
  authenticate,
  param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { jobId } = req.params;

    try {
      // Get job to verify ownership
      const status = await aiJobQueue.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Verify user owns this job
      if (status.data?.userId !== authReq.user?.id) {
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
      const queueEvents = aiJobQueue.getQueueEvents();

      // Listen for progress updates
      const onProgress = async (data: { jobId: string; data: any }) => {
        if (data.jobId === jobId) {
          res.write(`data: ${JSON.stringify({ type: 'progress', progress: data.data })}\n\n`);
        }
      };

      // Listen for completion
      const onCompleted = async (data: { jobId: string; returnvalue: any }) => {
        if (data.jobId === jobId) {
          res.write(`data: ${JSON.stringify({ type: 'completed', result: data.returnvalue })}\n\n`);
          res.end();
        }
      };

      // Listen for failure
      const onFailed = async (data: { jobId: string; failedReason: string }) => {
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

    } catch (error: any) {
      logger.error('SSE streaming error', {
        jobId,
        error: error.message,
        userId: authReq.user?.id,
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to establish SSE connection',
        });
      }
    }
  }
);

/**
 * GET /api/ai/generate/models
 * Get list of allowed models per provider
 */
router.get('/models',
  authenticate,
  async (req: Request, res: Response) => {
    const { MODEL_WHITELIST, PARAMETER_LIMITS } = await import('../types/ai-proxy.types.js');

    res.json({
      success: true,
      data: {
        models: MODEL_WHITELIST,
        limits: PARAMETER_LIMITS,
      },
    });
  }
);

/**
 * GET /api/ai/jobs/metrics
 * Sprint 3: Observability - Get AI job metrics and statistics
 * Returns: success rate, processing time, retry counts, validation rates, queue status
 */
router.get('/jobs/metrics',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      // Get time range from query (default: last 24 hours)
      const timeRangeHours = parseInt(req.query.hours as string) || 24;
      const timeRangeMs = timeRangeHours * 60 * 60 * 1000;

      const metrics = await aiMetrics.collectMetrics(timeRangeMs);

      logger.info('AI metrics collected', {
        userId: authReq.user?.id,
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

    } catch (error: any) {
      logger.error('Failed to collect AI metrics', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to collect metrics',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ai/jobs/history
 * Sprint 3: Get recent job history
 */
router.get('/jobs/history',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await aiMetrics.getRecentJobs(limit);

      res.json({
        success: true,
        data: {
          jobs: history,
          total: history.length,
        },
      });

    } catch (error: any) {
      logger.error('Failed to get job history', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get job history',
      });
    }
  }
);

/**
 * POST /api/ai/jobs/:jobId/retry
 * Sprint 3: Re-run a job with same configuration
 * Links original job to re-run job via relatedJobId
 */
router.post('/jobs/:jobId/retry',
  authenticate,
  param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { jobId } = req.params;
    const newRequestId = uuidv4();

    try {
      // Get original job
      const originalJob = await aiJobQueue.getJobStatus(jobId);

      if (!originalJob) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Verify user owns this job
      if (originalJob.data?.userId !== authReq.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Prepare job data with same configuration
      const jobData: AIJobData = {
        ...originalJob.data,
        requestId: newRequestId,
        // Note: Keep same userId, provider, model, prompts, parameters
      };

      // Enqueue new job
      const newJobId = await aiJobQueue.enqueueJob(jobData);

      logger.info('AI job re-run enqueued', {
        originalJobId: jobId,
        newJobId,
        userId: authReq.user?.id,
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

    } catch (error: any) {
      logger.error('Failed to re-run job', {
        jobId,
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to re-run job',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ai/dlq
 * Sprint 4: Get Dead Letter Queue entries
 */
router.get('/dlq',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const entries = await aiDLQ.getDLQEntries(limit, offset);

      res.json({
        success: true,
        data: {
          entries,
          total: entries.length,
          limit,
          offset,
        },
      });

    } catch (error: any) {
      logger.error('Failed to get DLQ entries', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get DLQ entries',
      });
    }
  }
);

/**
 * GET /api/ai/dlq/stats
 * Sprint 4: Get DLQ statistics
 */
router.get('/dlq/stats',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      const stats = await aiDLQ.getDLQStats();

      res.json({
        success: true,
        data: stats,
      });

    } catch (error: any) {
      logger.error('Failed to get DLQ stats', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get DLQ stats',
      });
    }
  }
);

/**
 * POST /api/ai/dlq/:dlqJobId/retry
 * Sprint 4: Retry job from DLQ
 */
router.post('/dlq/:dlqJobId/retry',
  authenticate,
  param('dlqJobId').isString().notEmpty().withMessage('DLQ Job ID is required'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { dlqJobId } = req.params;

    try {
      const newJobId = await aiDLQ.retryFromDLQ(dlqJobId, aiJobQueue.getQueue());

      if (!newJobId) {
        return res.status(400).json({
          success: false,
          error: 'Failed to retry job from DLQ (job not found or not retryable)',
        });
      }

      logger.info('Job retried from DLQ', {
        dlqJobId,
        newJobId,
        userId: authReq.user?.id,
      });

      res.json({
        success: true,
        data: {
          newJobId,
          status: 'queued',
        },
      });

    } catch (error: any) {
      logger.error('Failed to retry job from DLQ', {
        dlqJobId,
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retry job from DLQ',
      });
    }
  }
);

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
router.get('/usage/report',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      // Parse query parameters
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const options = {
        userId: req.query.userId as string | undefined,
        provider: req.query.provider as string | undefined,
        model: req.query.model as string | undefined,
        topUsersLimit: req.query.topUsersLimit
          ? parseInt(req.query.topUsersLimit as string)
          : 10,
      };

      const format = (req.query.format as string) || 'json';

      // Generate report
      const report = await aiUsageReport.generateReport(startDate, endDate, options);

      // Return based on format
      if (format === 'csv') {
        const csv = aiUsageReport.exportAsCSV(report);
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', `attachment; filename="ai-usage-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: report,
        });
      }

      logger.info('Usage report generated', {
        userId: authReq.user?.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format,
        totalJobs: report.totalJobs,
        totalCost: report.totalEstimatedCost,
      });

    } catch (error: any) {
      logger.error('Failed to generate usage report', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate usage report',
      });
    }
  }
);

/**
 * GET /api/ai/usage/current-month
 * Get current month usage report
 */
router.get('/usage/current-month',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      const report = await aiUsageReport.getCurrentMonthReport();

      res.json({
        success: true,
        data: report,
      });

      logger.info('Current month usage report generated', {
        userId: authReq.user?.id,
        totalJobs: report.totalJobs,
        totalCost: report.totalEstimatedCost,
      });

    } catch (error: any) {
      logger.error('Failed to generate current month report', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate current month report',
      });
    }
  }
);

/**
 * GET /api/ai/usage/last-n-days
 * Get last N days usage report
 *
 * Query params:
 * - days: Number of days (default: 7)
 */
router.get('/usage/last-n-days',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;

      if (days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          error: 'Days must be between 1 and 365',
        });
      }

      const report = await aiUsageReport.getLastNDaysReport(days);

      res.json({
        success: true,
        data: report,
      });

      logger.info('Last N days usage report generated', {
        userId: authReq.user?.id,
        days,
        totalJobs: report.totalJobs,
        totalCost: report.totalEstimatedCost,
      });

    } catch (error: any) {
      logger.error('Failed to generate last N days report', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate last N days report',
      });
    }
  }
);

/**
 * POST /api/ai/save-block
 * Phase 2-B: Save AI-generated block to filesystem and Git
 *
 * Request body:
 * - componentName: string (required, PascalCase)
 * - componentCode: string (required, TypeScript React component code)
 * - definitionCode: string (required, BlockDefinition code)
 * - savePath: string (optional, defaults to apps/admin-dashboard/src/blocks/generated)
 *
 * Returns:
 * - success: boolean
 * - files: { component: string, definition: string }
 * - git: { branch: string, commit: string }
 * - renamedTo: string (if filename conflict occurred)
 */
router.post('/save-block',
  authenticate,
  aiProxyRateLimit,
  body('componentName').isString().notEmpty().withMessage('Component name is required'),
  body('componentCode').isString().notEmpty().withMessage('Component code is required'),
  body('definitionCode').isString().notEmpty().withMessage('Definition code is required'),
  body('savePath').optional().isString().withMessage('Save path must be a string'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const startTime = Date.now();

    try {
      const userId = authReq.user?.id;
      const userEmail = authReq.user?.email;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Check if user has admin permissions
      // TODO: Add role-based access control if needed
      // For now, only authenticated users can save blocks

      const { componentName, componentCode, definitionCode, savePath } = req.body;

      logger.info('🚀 AI block save request received', {
        userId,
        userEmail,
        componentName,
        savePath: savePath || 'default',
      });

      // Call AI block writer service
      const result = await aiBlockWriter.saveBlock({
        componentName,
        componentCode,
        definitionCode,
        savePath,
      });

      const duration = Date.now() - startTime;

      if (!result.success) {
        logger.error('❌ Block save failed', {
          userId,
          userEmail,
          componentName,
          error: result.error,
          duration: `${duration}ms`,
        });

        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to save block',
        });
      }

      logger.info('✅ Block save successful', {
        userId,
        userEmail,
        componentName,
        renamedTo: result.renamedTo,
        files: result.files,
        git: result.git,
        duration: `${duration}ms`,
      });

      res.json({
        success: true,
        data: {
          files: result.files,
          git: result.git,
          renamedTo: result.renamedTo,
        },
        message: result.renamedTo
          ? `Block saved as ${result.renamedTo} (original name conflict)`
          : 'Block saved successfully',
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('❌ Block save unexpected error', {
        userId: authReq.user?.id,
        userEmail: authReq.user?.email,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while saving block',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ai/saved-blocks
 * Phase 2-B: List all AI-generated blocks
 */
router.get('/saved-blocks',
  authenticate,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    try {
      const blocks = await aiBlockWriter.listGeneratedBlocks();

      res.json({
        success: true,
        data: {
          blocks,
          total: blocks.length,
        },
      });

    } catch (error: any) {
      logger.error('Failed to list saved blocks', {
        userId: authReq.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list saved blocks',
      });
    }
  }
);

/**
 * DELETE /api/ai/saved-blocks/:componentName
 * Phase 2-B: Delete an AI-generated block
 */
router.delete('/saved-blocks/:componentName',
  authenticate,
  param('componentName').isString().notEmpty().withMessage('Component name is required'),
  validateDto,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { componentName } = req.params;

    try {
      // Check admin permissions
      // TODO: Add role-based access control if needed

      const deleted = await aiBlockWriter.deleteBlock(componentName);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Block not found or failed to delete',
        });
      }

      logger.info('🗑️ Block deleted via API', {
        userId: authReq.user?.id,
        componentName,
      });

      res.json({
        success: true,
        message: 'Block deleted successfully',
      });

    } catch (error: any) {
      logger.error('Failed to delete block', {
        userId: authReq.user?.id,
        componentName,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete block',
      });
    }
  }
);

export default router;
