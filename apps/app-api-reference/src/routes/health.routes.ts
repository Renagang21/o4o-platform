/**
 * Health Check Routes
 * =============================================================================
 * Required endpoints for all App API servers (from app-api-architecture.md).
 *
 * Endpoints:
 * - /health       : Liveness check (is the process running?)
 * - /health/ready : Readiness check (are dependencies available?)
 * =============================================================================
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';

const router = Router();

// Track server start time
const startTime = Date.now();

/**
 * GET /health
 * Liveness probe - returns 200 if the server is running
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: '1.0.0',
    service: 'app-api-reference',
    environment: env.NODE_ENV,
  });
});

/**
 * GET /health/ready
 * Readiness probe - checks if all dependencies are available
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let allHealthy = true;

  // Check Core API connectivity
  try {
    const startMs = Date.now();
    const response = await axios.get(`${env.CORE_API_URL}/health`, {
      timeout: 5000,
    });
    const latencyMs = Date.now() - startMs;

    if (response.data?.status === 'alive') {
      checks.coreApi = { status: 'healthy', latency: latencyMs };
    } else {
      checks.coreApi = { status: 'unhealthy', error: 'Invalid response' };
      allHealthy = false;
    }
  } catch (error: any) {
    checks.coreApi = {
      status: 'unhealthy',
      error: error.message || 'Connection failed',
    };
    allHealthy = false;
  }

  // Add more dependency checks here as needed
  // e.g., database, cache, external services

  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  });
});

/**
 * GET /health/live
 * Alternative liveness endpoint (Kubernetes style)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'live' });
});

export default router;
