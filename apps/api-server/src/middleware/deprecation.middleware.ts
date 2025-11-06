import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * Deprecation Middleware
 * Phase 2 - Route Deprecation Management
 *
 * Adds deprecation headers to legacy routes and logs usage
 * for monitoring migration progress.
 */

export interface DeprecationOptions {
  successorRoute: string;
  message?: string;
  sunsetDate?: string;
}

/**
 * Add deprecation headers to a route
 *
 * @param options - Configuration for the deprecation warning
 * @returns Express middleware
 *
 * @example
 * router.get('/api/posts',
 *   addDeprecationHeaders({
 *     successorRoute: '/api/v1/posts',
 *     message: 'Use /api/v1/posts instead',
 *     sunsetDate: '2025-12-31'
 *   }),
 *   handler
 * );
 */
export function addDeprecationHeaders(options: DeprecationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if deprecation warnings are enabled
    const deprecationEnabled = process.env.ROUTE_DEPRECATION_FLAGS === 'on';

    // Debug logging
    logger.info(`[DEPRECATION_DEBUG] path=${req.path} envValue=${process.env.ROUTE_DEPRECATION_FLAGS} enabled=${deprecationEnabled}`);

    if (!deprecationEnabled) {
      return next();
    }

    // Add Deprecation header (RFC 8594)
    res.setHeader('Deprecation', 'true');

    // Add Link header with successor version
    res.setHeader('Link', `<${options.successorRoute}>; rel="successor-version"`);

    // Optionally add Sunset header if date is provided
    if (options.sunsetDate) {
      res.setHeader('Sunset', new Date(options.sunsetDate).toUTCString());
    }

    // Log deprecation usage for monitoring
    logger.warn('Deprecated route accessed', {
      path: req.path,
      method: req.method,
      successorRoute: options.successorRoute,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    next();
  };
}

/**
 * Middleware that adds a custom deprecation warning to response body
 * Use this for JSON API responses where clients can programmatically check
 *
 * @param options - Configuration for the deprecation warning
 * @returns Express middleware
 */
export function wrapWithDeprecationWarning(options: DeprecationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const deprecationEnabled = process.env.ROUTE_DEPRECATION_FLAGS === 'on';

    if (!deprecationEnabled) {
      return next();
    }

    // Intercept res.json to add deprecation warning to body
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const wrappedBody = {
        ...body,
        _deprecation: {
          deprecated: true,
          message: options.message || `This endpoint is deprecated. Use ${options.successorRoute} instead.`,
          successorRoute: options.successorRoute,
          ...(options.sunsetDate && { sunsetDate: options.sunsetDate })
        }
      };
      return originalJson(wrappedBody);
    };

    next();
  };
}
