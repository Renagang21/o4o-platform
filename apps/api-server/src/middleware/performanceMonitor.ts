import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redactSensitive } from '../utils/security-log-redaction.js';

interface RequestWithTiming extends Request {
  startTime?: number;
}

/**
 * 운영/성능 로그용 request body 메타데이터.
 *
 * WO-O4O-REQUEST-BODY-LOGGING-PRIVACY-CLOSURE-V1 §5·§6:
 *   성능·운영 로그에는 request body 원문을 기록하지 않는다. body 존재 여부와 크기,
 *   content-type 같은 비식별 메타데이터만 남긴다. (key 기반 마스킹에 의존하지 않는다 —
 *   body 자체를 로그에 넣지 않는 것이 원칙.)
 */
function bodyMeta(req: Request): { bodyPresent: boolean; bodyBytes: number; contentType: string | undefined } {
  const contentLength = req.get('content-length');
  const bodyBytes = contentLength ? parseInt(contentLength, 10) || 0 : 0;
  const body = (req as { body?: unknown }).body;
  const bodyPresent = bodyBytes > 0 || (body != null && (typeof body !== 'object' || Object.keys(body as object).length > 0));
  return {
    bodyPresent,
    bodyBytes,
    contentType: req.get('content-type'),
  };
}

// Performance monitoring middleware
export const performanceMonitor = (req: RequestWithTiming, res: Response, next: NextFunction) => {
  // Record start time
  req.startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args: any[]): Response {
    // Calculate response time
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Log performance metrics
    logger.info(`API Performance`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length') || '0',
      userAgent: req.get('user-agent'),
      ip: req.ip
    });

    // Log slow requests (> 1000ms)
    if (responseTime > 1000) {
      // request body 원문은 로그에 남기지 않는다 (WO-O4O-REQUEST-BODY-LOGGING-PRIVACY-CLOSURE-V1).
      // 비식별 메타데이터(bodyPresent/bodyBytes/contentType)만 기록하고, query 는 민감 키를 redact 한다.
      logger.warn(`Slow API Response`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        query: redactSensitive(req.query),
        ...bodyMeta(req),
      });
    }

    // Call original end and return the result
    return originalEnd.apply(res, args);
  };

  next();
};

// Memory usage monitor
export const memoryMonitor = () => {
  const memoryUsage = process.memoryUsage();
  const formatMemory = (bytes: number) => `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;

  logger.info('Memory Usage', {
    rss: formatMemory(memoryUsage.rss),
    heapTotal: formatMemory(memoryUsage.heapTotal),
    heapUsed: formatMemory(memoryUsage.heapUsed),
    external: formatMemory(memoryUsage.external)
  });
};

// Start periodic memory monitoring
if (process.env.NODE_ENV === 'production') {
  // Log memory usage every 5 minutes
  setInterval(memoryMonitor, 5 * 60 * 1000);
}

// Database query performance logger
export const logQueryPerformance = (query: string, parameters: any[], duration: number) => {
  if (duration > 100) { // Log queries taking more than 100ms
    logger.warn('Slow Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      duration: `${duration}ms`,
      parameters: parameters?.length || 0
    });
  }
};