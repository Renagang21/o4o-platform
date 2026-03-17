/**
 * HTTP Request Logging Middleware
 *
 * WO-O4O-STRUCTURED-LOGGING-IMPLEMENTATION-V1
 *
 * pino-http based middleware that:
 * 1. Generates/propagates requestId (x-request-id header)
 * 2. Logs every HTTP request/response with structured data
 * 3. Sets up AsyncLocalStorage context for downstream code
 *
 * Registration: early in middleware chain (after CORS, before routes)
 */

import pinoHttp from 'pino-http';
import type { Request, Response, NextFunction } from 'express';
import logger from './index.js';
import { requestContextStorage, generateRequestId } from './request-context.js';
import type { RequestContext } from './request-context.js';

// ─── Skip Paths (reduce noise) ─────────────────────────────────────────────

const SKIP_PATHS = new Set(['/health', '/health/', '/metrics', '/favicon.ico']);

// ─── pino-http instance ─────────────────────────────────────────────────────

const pinoHttpMiddleware = pinoHttp({
  // Use the raw pino instance (not the wrapped logger)
  logger: logger._pino,

  // Use incoming x-request-id or generate new UUID
  genReqId: (req: Request) => {
    return generateRequestId(req.headers['x-request-id'] as string | undefined);
  },

  // Skip health check endpoints to reduce log volume
  autoLogging: {
    ignore: (req: Request) => SKIP_PATHS.has(req.url?.split('?')[0] || ''),
  },

  // Minimal request/response serializers (avoid logging large bodies/headers)
  serializers: {
    req(req: any) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
      };
    },
  },

  // Dynamic log level based on response status
  customLogLevel(_req: Request, res: Response, err?: Error) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Concise log messages
  customSuccessMessage(req: Request, res: Response) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  customErrorMessage(req: Request, res: Response, err: Error) {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
});

// ─── Combined Middleware ────────────────────────────────────────────────────

/**
 * Wraps pino-http with AsyncLocalStorage context.
 * Sets x-request-id response header for client-side correlation.
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = generateRequestId(req.headers['x-request-id'] as string | undefined);

  const context: RequestContext = {
    requestId,
    startTime: Date.now(),
    method: req.method,
    path: req.url,
  };

  // Set requestId on response header for client correlation
  res.setHeader('x-request-id', requestId);

  // Also set on req for downstream access
  (req as any).requestId = requestId;

  // Run the rest of the middleware chain within AsyncLocalStorage context
  requestContextStorage.run(context, () => {
    pinoHttpMiddleware(req, res, next);
  });
}
