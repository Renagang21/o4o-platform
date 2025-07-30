import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ok } from '../utils/apiResponse';
import logger from '../utils/simpleLogger';
import { AppDataSource } from '../database/connection';
import os from 'os';

const router: Router = Router();

// 모든 모니터링 엔드포인트는 관리자 권한 필요
router.use(authenticateToken);
router.use((req: AuthRequest, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// 시스템 헬스 체크
router.get('/health', asyncHandler(async (req: AuthRequest, res) => {
  const startTime = Date.now();
  
  // 데이터베이스 연결 체크
  let dbConnected = false;
  let dbResponseTime = 0;
  let activeConnections = 0;
  
  try {
    const dbStart = Date.now();
    await AppDataSource.query('SELECT 1');
    dbResponseTime = Date.now() - dbStart;
    dbConnected = true;
    
    // PostgreSQL 연결 수 확인
    const result = await AppDataSource.query(
      "SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()"
    );
    activeConnections = parseInt(result[0].count) || 0;
  } catch (error) {
    logger.error('Database health check failed', { error });
  }

  // 메모리 사용량
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  // CPU 사용률 (간단한 추정)
  const cpuUsage = process.cpuUsage();
  const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000); // 대략적인 %
  
  // 전체 시스템 상태 결정
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (!dbConnected || dbResponseTime > 1000) {
    status = 'critical';
  } else if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.85 || cpuPercent > 85) {
    status = 'warning';
  }
  
  const health = {
    status,
    uptime: process.uptime(),
    memoryUsage: {
      used: Math.round(usedMemory / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      percentage: Math.round((usedMemory / totalMemory) * 100)
    },
    cpu: {
      usage: cpuPercent
    },
    database: {
      connected: dbConnected,
      responseTime: dbResponseTime,
      activeConnections
    },
    responseTime: Date.now() - startTime
  };
  
  ok(res, health);
}));

// 성능 메트릭 (임시 데이터 - 실제로는 로그에서 집계)
router.get('/performance', asyncHandler(async (req: AuthRequest, res) => {
  const range = req.query.range || '24h';
  
  // 실제로는 로그 데이터베이스에서 집계해야 함
  const mockMetrics = [
    {
      endpoint: '/api/v1/dashboard/overview',
      method: 'GET',
      avgResponseTime: 145,
      count: 234,
      errorRate: 0.5
    },
    {
      endpoint: '/api/v1/users',
      method: 'GET',
      avgResponseTime: 89,
      count: 567,
      errorRate: 0.2
    },
    {
      endpoint: '/api/v1/products',
      method: 'GET',
      avgResponseTime: 156,
      count: 432,
      errorRate: 1.2
    },
    {
      endpoint: '/api/v1/auth/sso/check',
      method: 'GET',
      avgResponseTime: 23,
      count: 1893,
      errorRate: 0.1
    },
    {
      endpoint: '/api/v1/orders',
      method: 'POST',
      avgResponseTime: 267,
      count: 89,
      errorRate: 2.3
    }
  ];
  
  ok(res, mockMetrics);
}));

// 에러 로그 (임시 데이터 - 실제로는 로그 파일에서 읽기)
router.get('/errors', asyncHandler(async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  
  // 실제로는 로그 파일이나 데이터베이스에서 읽어야 함
  const mockErrors = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      level: 'error',
      message: 'Database connection timeout',
      code: 'DB_TIMEOUT',
      endpoint: '/api/v1/products',
      statusCode: 500
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      level: 'warn',
      message: 'Slow query detected',
      code: 'SLOW_QUERY',
      endpoint: '/api/v1/orders',
      statusCode: 200
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      level: 'error',
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN',
      endpoint: '/api/v1/users/profile',
      statusCode: 401
    }
  ].slice(0, limit);
  
  ok(res, mockErrors);
}));

export default router;