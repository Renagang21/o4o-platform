import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to mark deprecated routes
 *
 * Adds deprecation headers to responses for legacy endpoints
 * that have been replaced by newer unified endpoints.
 *
 * Usage:
 * ```typescript
 * app.use('/api/old-endpoint', deprecatedRoute('/api/v1/new-endpoint'));
 * ```
 */
export function deprecatedRoute(newEndpoint: string, sunsetDate?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add Deprecation header (RFC 8594)
    res.setHeader('Deprecation', 'true');

    // Add Sunset header if provided (RFC 8594)
    if (sunsetDate) {
      res.setHeader('Sunset', sunsetDate);
    }

    // Add Link header pointing to replacement (RFC 8288)
    res.setHeader('Link', `<${newEndpoint}>; rel="alternate"`);

    // Add custom header for easier detection
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Replacement', newEndpoint);

    // Add deprecation warning to response body if JSON
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      if (body && typeof body === 'object') {
        body._deprecated = {
          message: `This endpoint is deprecated. Please use ${newEndpoint} instead.`,
          replacement: newEndpoint,
          ...(sunsetDate && { sunsetDate })
        };
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware to log deprecated route usage
 */
export function logDeprecatedUsage(routePath: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.warn(`[DEPRECATED] ${req.method} ${routePath} accessed from ${req.ip || 'unknown'}`);
    next();
  };
}
