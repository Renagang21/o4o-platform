/**
 * Performance Monitoring Utilities
 * R-8-7: Performance Audit & Caching Optimization
 *
 * Provides tools for measuring query execution times, API response times,
 * and logging slow queries for performance analysis.
 */

import logger from './logger.js';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface SlowQueryLog {
  query: string;
  parameters?: any[];
  duration: number;
  timestamp: Date;
  stack?: string;
}

/**
 * Performance Monitor Class
 * Tracks execution times and logs slow operations
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private slowQueryThreshold: number = 1000; // 1 second default
  private slowApiThreshold: number = 2000; // 2 seconds default
  private slowQueries: SlowQueryLog[] = [];
  private maxSlowQueriesStored: number = 100;

  constructor(slowQueryThreshold?: number, slowApiThreshold?: number) {
    if (slowQueryThreshold) this.slowQueryThreshold = slowQueryThreshold;
    if (slowApiThreshold) this.slowApiThreshold = slowApiThreshold;
  }

  /**
   * Start measuring performance
   */
  start(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End measurement and return duration
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`[PerformanceMonitor] No start time found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log if slow
    if (duration > this.slowApiThreshold) {
      logger.warn(`[PerformanceMonitor] Slow operation detected: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        metadata: metric.metadata
      });
    }

    this.metrics.delete(name);
    return duration;
  }

  /**
   * Measure async function execution
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      const duration = this.end(name);

      logger.debug(`[PerformanceMonitor] ${name}: ${duration?.toFixed(2)}ms`);

      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Log a slow query
   */
  logSlowQuery(query: string, duration: number, parameters?: any[]): void {
    if (duration < this.slowQueryThreshold) return;

    const slowQuery: SlowQueryLog = {
      query,
      parameters,
      duration,
      timestamp: new Date(),
      stack: new Error().stack
    };

    this.slowQueries.push(slowQuery);

    // Keep only last N slow queries
    if (this.slowQueries.length > this.maxSlowQueriesStored) {
      this.slowQueries.shift();
    }

    logger.warn('[PerformanceMonitor] Slow query detected', {
      duration: `${duration.toFixed(2)}ms`,
      query: query.substring(0, 200) // Truncate long queries
    });
  }

  /**
   * Get all slow queries
   */
  getSlowQueries(): SlowQueryLog[] {
    return [...this.slowQueries];
  }

  /**
   * Clear slow query log
   */
  clearSlowQueries(): void {
    this.slowQueries = [];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    activeMetrics: number;
    slowQueries: number;
    slowQueryThreshold: number;
    slowApiThreshold: number;
  } {
    return {
      activeMetrics: this.metrics.size,
      slowQueries: this.slowQueries.length,
      slowQueryThreshold: this.slowQueryThreshold,
      slowApiThreshold: this.slowApiThreshold
    };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method execution time
 */
export function MeasurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Express middleware for measuring API response time
 */
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const metricName = `API:${req.method}:${req.path}`;

    // Override res.json to measure response time
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const duration = performance.now() - startTime;

      // Log slow APIs
      if (duration > performanceMonitor['slowApiThreshold']) {
        logger.warn('[API] Slow response detected', {
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode
        });
      }

      // Add performance header
      res.set('X-Response-Time', `${duration.toFixed(2)}ms`);

      return originalJson(body);
    };

    next();
  };
}

/**
 * TypeORM Query Logger for slow query detection
 */
export class PerformanceQueryLogger {
  private queries: Map<string, number> = new Map();

  logQuery(query: string, parameters?: any[]): void {
    this.queries.set(query, performance.now());
  }

  logQueryError(error: string, query: string, parameters?: any[]): void {
    logger.error('[TypeORM] Query error', { error, query, parameters });
    this.queries.delete(query);
  }

  logQuerySlow(time: number, query: string, parameters?: any[]): void {
    performanceMonitor.logSlowQuery(query, time, parameters);
  }

  logSchemaBuild(time: number): void {
    logger.debug(`[TypeORM] Schema build time: ${time}ms`);
  }

  logMigration(message: string): void {
    logger.info(`[TypeORM] ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any): void {
    logger[level === 'log' ? 'debug' : level](`[TypeORM] ${message}`);
  }
}

/**
 * Helper to measure database query execution
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    if (duration > performanceMonitor['slowQueryThreshold']) {
      performanceMonitor.logSlowQuery(queryName, duration);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`[Query] Error in ${queryName} (${duration.toFixed(2)}ms)`, error);
    throw error;
  }
}
