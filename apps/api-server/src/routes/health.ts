import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import * as os from 'os';

const router: Router = Router();

/**
 * ============================================================================
 * Health Check Routes - Phase 2.5 GRACEFUL_STARTUP Compatible
 * ============================================================================
 *
 * Cloud Run / Container Orchestration Strategy:
 * - /health (GET): ALWAYS returns 200 - server is running and accepting requests
 *   This is the primary health check for Cloud Run startup/liveness probes
 *
 * - /health/live (GET): Liveness probe - process is alive
 * - /health/ready (GET): Readiness probe - all dependencies are ready (may return 503)
 * - /health/detailed (GET): Detailed health with all component statuses
 *
 * IMPORTANT: /health MUST return 200 even if DB is not connected.
 * DB status is included as optional info in the response.
 * ============================================================================
 */

// Basic health check endpoint - ALWAYS returns 200
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await performHealthCheck();
    // Always return 200 - server is alive and can serve requests
    // DB status is informational only
    res.status(200).json(health);
  } catch (error: any) {
    // Even on error, return 200 with error info - server is still running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.5.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Health check error'
      },
      memory: {
        used: Math.round(process.memoryUsage().rss / 1024 / 1024),
        total: Math.round(os.totalmem() / 1024 / 1024),
        percentage: Math.round((process.memoryUsage().rss / os.totalmem()) * 100)
      }
    });
  }
});

// Detailed health check with all components
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const health = await performDetailedHealthCheck();
    
    const overallHealthy = health.checks.every((check: { status: string }) => check.status === 'healthy');
    
    res.status(overallHealthy ? 200 : 503).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness probe for Kubernetes/container orchestration
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical components are ready
    const isReady = await checkReadiness();
    
    if (isReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe for Kubernetes/container orchestration
router.get('/live', async (req: Request, res: Response) => {
  try {
    // Basic liveness check - just return that the process is running
    res.json({
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'dead',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Component-specific health checks
router.get('/database', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.status(dbHealth.status === 'healthy' ? 200 : 503).json(dbHealth);
  } catch (error: any) {
    res.status(503).json({
      component: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/system', async (req: Request, res: Response) => {
  try {
    const systemHealth = await checkSystemHealth();
    res.json(systemHealth);
  } catch (error: any) {
    res.status(503).json({
      component: 'system',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Redis health check endpoint
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const redisHealth = await checkRedisHealth();
    res.status(redisHealth.status === 'healthy' ? 200 : 503).json(redisHealth);
  } catch (error: any) {
    res.status(503).json({
      component: 'redis',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions
interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  responseTime: number;
  version: string;
  environment: string;
  database: {
    status: string;
    error?: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

async function performHealthCheck(): Promise<HealthCheckResponse> {
  const start = Date.now();

  // Check database connectivity (optional - doesn't affect overall status)
  let dbStatus = 'not_connected';
  let dbError: string | undefined;

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      dbStatus = 'healthy';
    } else {
      dbStatus = 'not_initialized';
      dbError = 'Database connection not initialized (GRACEFUL_STARTUP mode)';
    }
  } catch (error: any) {
    dbStatus = 'unhealthy';
    dbError = error instanceof Error ? error.message : 'Database connection failed';
  }

  const responseTime = Date.now() - start;

  // Server is always "alive" if we reach this point
  // DB status is informational only
  const status = 'alive';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime,
    version: process.env.npm_package_version || '0.5.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      error: dbError
    },
    memory: {
      used: Math.round(process.memoryUsage().rss / 1024 / 1024),
      total: Math.round(os.totalmem() / 1024 / 1024),
      percentage: Math.round((process.memoryUsage().rss / os.totalmem()) * 100)
    }
  };
}

interface DetailedHealthCheckResponse {
  status: string;
  timestamp: string;
  responseTime: number;
  checks: HealthComponent[];
}

async function performDetailedHealthCheck(): Promise<DetailedHealthCheckResponse> {
  const start = Date.now();
  
  const checks = await Promise.all([
    checkDatabaseHealth(),
    checkSystemHealth(),
    checkMemoryHealth(),
    checkDiskHealth()
  ]);
  
  const overallStatus = checks.every((check: any) => check.status === 'healthy') ? 'healthy' : 'unhealthy';
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - start,
    checks
  };
}

async function checkReadiness(): Promise<boolean> {
  try {
    // Check database connection
    await AppDataSource.query('SELECT 1');
    
    // Check if we have enough memory
    const memUsage = process.memoryUsage().rss / os.totalmem();
    if (memUsage > 0.9) { // 90% memory usage
      return false;
    }
    
    return true;
  } catch (error: any) {
    return false;
  }
}

interface HealthComponent {
  component: string;
  status: string;
  responseTime?: number;
  details?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

async function checkDatabaseHealth(): Promise<HealthComponent> {
  const start = Date.now();
  
  try {
    // Test basic connectivity
    await AppDataSource.query('SELECT 1');
    
    // Check database version
    const versionResult = await AppDataSource.query('SELECT version()');
    
    // Check active connections
    const connectionsResult = await AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
    
    // Check for long-running queries
    const longQueriesResult = await AppDataSource.query(`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE state = 'active' AND query_start < now() - interval '5 minutes'
    `);
    
    const responseTime = Date.now() - start;
    const longQueries = parseInt(longQueriesResult[0].count);
    
    return {
      component: 'database',
      status: longQueries > 5 ? 'degraded' : 'healthy',
      responseTime,
      details: {
        version: versionResult[0].version.split(' ')[1],
        activeConnections: parseInt(connectionsResult[0].count),
        longRunningQueries: longQueries
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      component: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database check failed',
      timestamp: new Date().toISOString()
    };
  }
}

async function checkSystemHealth(): Promise<HealthComponent> {
  const memUsage = process.memoryUsage();
  const systemMem = {
    total: os.totalmem(),
    free: os.freemem()
  };
  
  const cpuUsage = process.cpuUsage();
  const loadAvg = os.loadavg();
  
  // Calculate CPU percentage (approximate)
  const cpuPercent = Math.round(((cpuUsage.user + cpuUsage.system) / 1000000) * 100) / 100;
  
  // Calculate memory percentage
  const memPercent = Math.round((memUsage.rss / systemMem.total) * 100);
  
  // Determine status based on thresholds
  let status = 'healthy';
  if (memPercent > 85 || loadAvg[0] > os.cpus().length * 0.8) {
    status = 'degraded';
  }
  if (memPercent > 95 || loadAvg[0] > os.cpus().length) {
    status = 'unhealthy';
  }
  
  return {
    component: 'system',
    status,
    details: {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.rss / 1024 / 1024),
        total: Math.round(systemMem.total / 1024 / 1024),
        percentage: memPercent
      },
      cpu: {
        usage: cpuPercent,
        loadAverage: loadAvg,
        cores: os.cpus().length
      },
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    },
    timestamp: new Date().toISOString()
  };
}

async function checkMemoryHealth(): Promise<HealthComponent> {
  const memUsage = process.memoryUsage();
  const systemMem = {
    total: os.totalmem(),
    free: os.freemem()
  };
  
  const memPercent = Math.round((memUsage.rss / systemMem.total) * 100);
  
  let status = 'healthy';
  if (memPercent > 80) status = 'degraded';
  if (memPercent > 90) status = 'unhealthy';
  
  return {
    component: 'memory',
    status,
    details: {
      process: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      system: {
        total: Math.round(systemMem.total / 1024 / 1024),
        free: Math.round(systemMem.free / 1024 / 1024),
        percentage: memPercent
      }
    },
    timestamp: new Date().toISOString()
  };
}

async function checkDiskHealth(): Promise<HealthComponent> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Get disk usage information
    const { stdout } = await execAsync("df -h / | tail -1");
    const parts = stdout.trim().split(/\s+/);
    
    const diskInfo = {
      filesystem: parts[0],
      size: parts[1],
      used: parts[2],
      available: parts[3],
      percentage: parseInt(parts[4].replace('%', ''))
    };
    
    let status = 'healthy';
    if (diskInfo.percentage > 80) status = 'degraded';
    if (diskInfo.percentage > 90) status = 'unhealthy';
    
    return {
      component: 'disk',
      status,
      details: diskInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      component: 'disk',
      status: 'unknown',
      error: 'Unable to check disk usage',
      timestamp: new Date().toISOString()
    };
  }
}

async function checkRedisHealth(): Promise<HealthComponent> {
  const start = Date.now();
  
  try {
    // Check if Redis environment variables are configured
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;
    
    if (!redisHost || !redisPort) {
      return {
        component: 'redis',
        status: 'not_configured',
        responseTime: Date.now() - start,
        details: {
          message: 'Redis is not configured. Set REDIS_HOST and REDIS_PORT environment variables.'
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // For now, return not configured status since Redis is optional
    // When Redis is implemented, add actual connection check here
    return {
      component: 'redis',
      status: 'not_configured',
      responseTime: Date.now() - start,
      details: {
        host: redisHost,
        port: redisPort,
        message: 'Redis connection not implemented yet'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      component: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Redis check failed',
      timestamp: new Date().toISOString()
    };
  }
}

export default router;