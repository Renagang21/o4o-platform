/**
 * Monitoring Metrics Middleware
 *
 * WO-O4O-MONITORING-IMPLEMENTATION-V1
 *
 * 요청 완료 시 메트릭 기록 + Slow API 탐지.
 * 기존 httpMetrics(Prometheus), performanceMonitor와 공존.
 *
 * 역할:
 * - 요청 카운터 (method + status)
 * - Slow API 탐지 (>500ms) + 구조화 로깅 + ring buffer 저장
 *
 * 등록 위치: main.ts에서 httpMetrics 뒤, routes 전.
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger.js';
import { getRequestId } from '../logger/request-context.js';
import { monitoringMetrics } from './metrics.service.js';

// ─── Path Normalization (cardinality control) ───────────────────────────────

function normalizePath(path: string): string {
  return path
    // UUID → :id
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Numeric segments → :id
    .replace(/\/\d+/g, '/:id');
}

// ─── Skip Paths ─────────────────────────────────────────────────────────────

const SKIP_PATHS = new Set(['/health', '/health/', '/metrics', '/favicon.ico']);

// ─── Middleware ──────────────────────────────────────────────────────────────

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const url = req.url?.split('?')[0] || '';
  if (SKIP_PATHS.has(url)) {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const normalizedPath = normalizePath(url);

    // Record request counter
    monitoringMetrics.recordRequest(req.method, normalizedPath, res.statusCode);

    // Slow API detection (>500ms)
    if (duration > monitoringMetrics.slowThreshold) {
      const requestId = getRequestId();

      monitoringMetrics.recordSlowRequest({
        path: normalizedPath,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        requestId,
        timestamp: new Date().toISOString(),
      });

      logger.warn('[SlowAPI] slow_api_detected', {
        path: normalizedPath,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        requestId,
      });
    }
  });

  next();
}
