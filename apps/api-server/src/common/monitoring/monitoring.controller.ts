/**
 * Monitoring Controller
 *
 * WO-O4O-MONITORING-IMPLEMENTATION-V1
 *
 * 통합 Monitoring API.
 * opsMetrics snapshot에서 prefix 필터링하여 카테고리별 메트릭 제공.
 *
 * Endpoints:
 *   GET  /monitoring/metrics        — 전체 메트릭 스냅샷
 *   GET  /monitoring/errors         — ErrorCode별 집계
 *   GET  /monitoring/slow-requests  — 최근 Slow API 리스트
 *   GET  /monitoring/auth           — Auth 실패 집계
 *   POST /monitoring/reset          — 메트릭 초기화
 */

import { Router, Request, Response } from 'express';
import { opsMetrics } from '../../services/ops-metrics.service.js';
import { monitoringMetrics, MONITORING } from './metrics.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract label values from opsMetrics key format.
 * e.g., "error.code{code=VALIDATION_ERROR}" → { code: "VALIDATION_ERROR" }
 */
function parseMetricKey(key: string): { metric: string; labels: Record<string, string> } {
  const braceIdx = key.indexOf('{');
  if (braceIdx === -1) {
    return { metric: key, labels: {} };
  }

  const metric = key.substring(0, braceIdx);
  const labelStr = key.substring(braceIdx + 1, key.length - 1); // strip { }
  const labels: Record<string, string> = {};

  for (const pair of labelStr.split(',')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      labels[pair.substring(0, eqIdx)] = pair.substring(eqIdx + 1);
    }
  }

  return { metric, labels };
}

/**
 * Filter snapshot by metric prefix and aggregate by a label key.
 */
function aggregateByLabel(
  snapshot: Record<string, number>,
  prefix: string,
  labelKey: string,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [key, count] of Object.entries(snapshot)) {
    const { metric, labels } = parseMetricKey(key);
    if (metric === prefix && labels[labelKey]) {
      const labelVal = labels[labelKey];
      result[labelVal] = (result[labelVal] || 0) + count;
    }
  }

  return result;
}

// ─── Controller Factory ─────────────────────────────────────────────────────

export function createMonitoringRoutes(): Router {
  const router = Router();

  // ================================================================
  // GET /monitoring/metrics — 전체 메트릭 스냅샷
  // ================================================================
  router.get('/metrics', (_req: Request, res: Response) => {
    const snapshot = opsMetrics.snapshot();
    const mem = process.memoryUsage();

    res.json({
      success: true,
      data: {
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        counters: snapshot,
        slowApiCount: monitoringMetrics.getSlowRequests().length,
        memoryMB: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
      },
    });
  });

  // ================================================================
  // GET /monitoring/errors — ErrorCode별 집계
  // ================================================================
  router.get('/errors', (_req: Request, res: Response) => {
    const snapshot = opsMetrics.snapshot();
    const errors = aggregateByLabel(snapshot, MONITORING.ERROR_CODE, 'code');

    res.json({
      success: true,
      data: { errors },
    });
  });

  // ================================================================
  // GET /monitoring/slow-requests — 최근 Slow API 리스트
  // ================================================================
  router.get('/slow-requests', (_req: Request, res: Response) => {
    const slowRequests = monitoringMetrics.getSlowRequests();

    res.json({
      success: true,
      data: {
        threshold: monitoringMetrics.slowThreshold,
        count: slowRequests.length,
        requests: slowRequests,
      },
    });
  });

  // ================================================================
  // GET /monitoring/auth — Auth 실패 집계
  // ================================================================
  router.get('/auth', (_req: Request, res: Response) => {
    const snapshot = opsMetrics.snapshot();
    const failures = aggregateByLabel(snapshot, MONITORING.AUTH_FAILURE, 'reason');

    res.json({
      success: true,
      data: { failures },
    });
  });

  // ================================================================
  // POST /monitoring/reset — 메트릭 초기화
  // ================================================================
  router.post('/reset', (_req: Request, res: Response) => {
    monitoringMetrics.reset();

    res.json({
      success: true,
      data: { message: 'Monitoring metrics reset (slow request buffer cleared)' },
    });
  });

  return router;
}
