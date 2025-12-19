import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../database/connection.js';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';

interface PerformanceLog {
  id?: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  userRole?: string;
  queryCount: number;
  cacheHit: boolean;
  errorMessage?: string;
  requestSize: number;
  responseSize: number;
  createdAt?: Date;
}

export const performanceMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseSize = 0;
  let queryCount = 0;
  let cacheHit = false;

  // Override res.send to capture response size
  res.send = function(data: any) {
    responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    return originalSend.call(this, data);
  };

  // Override res.json to capture response size
  res.json = function(data: any) {
    responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    return originalJson.call(this, data);
  };

  // Track database queries
  const originalQuery = AppDataSource.query;
  AppDataSource.query = function(...args: any[]) {
    queryCount++;
    return originalQuery.apply(this, args);
  };

  // Set cache hit flag if present in headers
  res.on('finish', async () => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    cacheHit = res.get('X-Cache-Hit') === 'true';
    
    const requestSize = req.get('content-length') 
      ? parseInt(req.get('content-length') || '0') 
      : 0;

    const performanceLog: PerformanceLog = {
      endpoint: req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      userId: req.user?.id,
      userRole: req.user?.role,
      queryCount,
      cacheHit,
      requestSize,
      responseSize,
    };

    // Add error message if response indicates error
    if (res.statusCode >= 400) {
      performanceLog.errorMessage = res.get('X-Error-Message') || 'Unknown error';
    }

    // Log performance metrics
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        endpoint: req.path,
        method: req.method,
        responseTime,
        queryCount,
        userId: req.user?.id
      });
    }

    // Save to database asynchronously
    try {
      await AppDataSource.query(`
        INSERT INTO system_performance_logs 
        (endpoint, method, "responseTime", "statusCode", "userId", "userRole", 
         "queryCount", "cacheHit", "errorMessage", "requestSize", "responseSize", "created_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        performanceLog.endpoint,
        performanceLog.method,
        performanceLog.responseTime,
        performanceLog.statusCode,
        performanceLog.userId,
        performanceLog.userRole,
        performanceLog.queryCount,
        performanceLog.cacheHit,
        performanceLog.errorMessage,
        performanceLog.requestSize,
        performanceLog.responseSize
      ]);
    } catch (error) {
      logger.error('Failed to save performance log:', error);
    }

    // Restore original query method
    AppDataSource.query = originalQuery;
  });

  next();
};

export const getPerformanceStats = async (timeRange: 'hour' | 'day' | 'week' = 'day') => {
  let timeCondition = '';
  switch (timeRange) {
    case 'hour':
      timeCondition = "createdAt >= NOW() - INTERVAL '1 hour'";
      break;
    case 'day':
      timeCondition = "createdAt >= NOW() - INTERVAL '1 day'";
      break;
    case 'week':
      timeCondition = "createdAt >= NOW() - INTERVAL '7 days'";
      break;
  }

  const stats = await AppDataSource.query(`
    SELECT 
      COUNT(*) as total_requests,
      AVG("responseTime") as avg_response_time,
      MAX("responseTime") as max_response_time,
      MIN("responseTime") as min_response_time,
      COUNT(*) FILTER (WHERE "statusCode" >= 400) as error_count,
      COUNT(*) FILTER (WHERE "statusCode" < 400) as success_count,
      AVG("queryCount") as avg_query_count,
      COUNT(*) FILTER (WHERE "cacheHit" = true) as cache_hits,
      COUNT(*) FILTER (WHERE "responseTime" > 1000) as slow_requests
    FROM system_performance_logs 
    WHERE ${timeCondition}
  `);

  const endpointStats = await AppDataSource.query(`
    SELECT 
      endpoint,
      method,
      COUNT(*) as request_count,
      AVG("responseTime") as avg_response_time,
      COUNT(*) FILTER (WHERE "statusCode" >= 400) as error_count
    FROM system_performance_logs 
    WHERE ${timeCondition}
    GROUP BY endpoint, method
    ORDER BY avg_response_time DESC
    LIMIT 20
  `);

  return {
    summary: stats[0] || {},
    slowestEndpoints: endpointStats || []
  };
};

export const getErrorAnalytics = async (timeRange: 'hour' | 'day' | 'week' = 'day') => {
  let timeCondition = '';
  switch (timeRange) {
    case 'hour':
      timeCondition = "createdAt >= NOW() - INTERVAL '1 hour'";
      break;
    case 'day':
      timeCondition = "createdAt >= NOW() - INTERVAL '1 day'";
      break;
    case 'week':
      timeCondition = "createdAt >= NOW() - INTERVAL '7 days'";
      break;
  }

  const errorStats = await AppDataSource.query(`
    SELECT 
      "statusCode",
      COUNT(*) as error_count,
      endpoint,
      method,
      "errorMessage"
    FROM system_performance_logs 
    WHERE ${timeCondition} AND "statusCode" >= 400
    GROUP BY "statusCode", endpoint, method, "errorMessage"
    ORDER BY error_count DESC
    LIMIT 50
  `);

  const errorTrends = await AppDataSource.query(`
    SELECT 
      DATE_TRUNC('hour', "created_at") as hour,
      COUNT(*) FILTER (WHERE "statusCode" >= 400) as error_count,
      COUNT(*) as total_requests
    FROM system_performance_logs 
    WHERE ${timeCondition}
    GROUP BY DATE_TRUNC('hour', "created_at")
    ORDER BY hour ASC
  `);

  return {
    errorsByType: errorStats || [],
    errorTrends: errorTrends || []
  };
};