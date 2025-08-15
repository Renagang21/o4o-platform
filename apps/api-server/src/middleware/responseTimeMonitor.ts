import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface ResponseMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

class ResponseTimeMonitor {
  private metricsFile: string;
  private metrics: ResponseMetrics[] = [];
  private flushInterval: number = 10000; // 10 seconds

  constructor() {
    this.metricsFile = path.join(process.cwd(), 'logs', 'response-metrics.json');
    this.startFlushTimer();
  }

  private startFlushTimer() {
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  private flushMetrics() {
    if (this.metrics.length === 0) return;

    const metricsToWrite = [...this.metrics];
    this.metrics = [];

    // Append metrics to file
    fs.appendFile(
      this.metricsFile,
      metricsToWrite.map(m => JSON.stringify(m)).join('\n') + '\n',
      (err) => {
        if (err) {
          console.error('Failed to write metrics:', err);
        }
      }
    );

    // Calculate and log statistics
    const avgResponseTime = metricsToWrite.reduce((sum, m) => sum + m.responseTime, 0) / metricsToWrite.length;
    const slowRequests = metricsToWrite.filter(m => m.responseTime > 1000);
    
    if (slowRequests.length > 0) {
      console.warn(`[MONITOR] ${slowRequests.length} slow requests detected (>1000ms)`);
      slowRequests.forEach(req => {
        console.warn(`[MONITOR] Slow: ${req.method} ${req.endpoint} - ${req.responseTime}ms`);
      });
    }

    // PM2 custom metrics
    if (process.send) {
      process.send({
        type: 'process:msg',
        data: {
          type: 'custom_metrics',
          avg_response_time: avgResponseTime,
          slow_requests_count: slowRequests.length,
          total_requests: metricsToWrite.length
        }
      });
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Store original end function
      const originalEnd = res.end;
      
      // Override end function
      res.end = function(...args: any[]) {
        const responseTime = Date.now() - startTime;
        
        // Record metrics
        const metric: ResponseMetrics = {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date()
        };
        
        this.metrics.push(metric);
        
        // Log slow requests immediately
        if (responseTime > 1000) {
          console.warn(`[SLOW REQUEST] ${req.method} ${req.path} took ${responseTime}ms`);
        }
        
        // Add response time header
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        
        // Call original end
        originalEnd.apply(res, args);
      }.bind(this);
      
      next();
    };
  }

  public getStats() {
    const last100 = this.metrics.slice(-100);
    
    if (last100.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        slowRequests: 0,
        totalRequests: 0
      };
    }
    
    const responseTimes = last100.map(m => m.responseTime);
    
    return {
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      slowRequests: responseTimes.filter(t => t > 1000).length,
      totalRequests: last100.length
    };
  }
}

// Export singleton instance
export const responseTimeMonitor = new ResponseTimeMonitor();
export default responseTimeMonitor.middleware();