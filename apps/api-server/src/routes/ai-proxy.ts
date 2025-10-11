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
import { body } from 'express-validator';
import { validateDto } from '../middleware/validateDto';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { aiProxyService } from '../services/ai-proxy.service';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { AIProxyError } from '../types/ai-proxy.types';

const router: Router = Router();

// AI Proxy rate limit (more restrictive than read endpoints)
const aiProxyRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per user
  message: 'AI generation rate limit exceeded. Please try again later.',
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return `ai:proxy:${authReq.user?.userId || req.ip || 'anonymous'}`;
  }
});

/**
 * POST /api/ai/generate
 * Server-side AI proxy endpoint
 * Accepts: { provider, model, systemPrompt, userPrompt, temperature?, maxTokens?, topP?, topK? }
 * Returns: { success, provider, model, usage, result, requestId }
 */
router.post('/generate',
  authenticateToken,
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
      const userId = authReq.user?.userId;

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
      logger.info('AI proxy request completed', {
        requestId,
        userId,
        userEmail: authReq.user?.email,
        provider,
        model,
        status: 'success',
        duration: `${duration}ms`,
        usage: response.usage,
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
          userId: authReq.user?.userId,
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
        userId: authReq.user?.userId,
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
  }
);

/**
 * GET /api/ai/generate/models
 * Get list of allowed models per provider
 */
router.get('/models',
  authenticateToken,
  async (req: Request, res: Response) => {
    const { MODEL_WHITELIST, PARAMETER_LIMITS } = await import('../types/ai-proxy.types');

    res.json({
      success: true,
      data: {
        models: MODEL_WHITELIST,
        limits: PARAMETER_LIMITS,
      },
    });
  }
);

export default router;
