import { Request, Response, NextFunction } from 'express';
import logger from '../utils/simpleLogger';

interface RequestWithTiming extends Request {
  startTime?: number;
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
      logger.warn(`Slow API Response`, {
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
        query: req.query,
        body: req.method === 'POST' ? req.body : undefined
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