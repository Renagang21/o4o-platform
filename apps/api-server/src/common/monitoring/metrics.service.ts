/**
 * Monitoring Metrics Service
 *
 * WO-O4O-MONITORING-IMPLEMENTATION-V1
 *
 * 통합 메트릭 서비스. 기존 opsMetrics(in-memory counter)를 활용하여
 * ErrorCode 집계, Auth 실패 카운터, Slow API 기록을 제공한다.
 *
 * 설계:
 * - 새 카운터 시스템을 만들지 않음 — opsMetrics.inc() 재활용
 * - Slow API는 ring buffer (최근 50개) + counter
 * - 모든 메서드는 fire-and-forget (에러 발생해도 요청 흐름 차단 안 함)
 */

import { opsMetrics } from '../../services/ops-metrics.service.js';

// ─── Pre-defined Metric Names ───────────────────────────────────────────────

export const MONITORING = {
  ERROR_CODE: 'error.code',
  AUTH_FAILURE: 'auth.failure',
  SLOW_API: 'slow.api',
  REQUEST_TOTAL: 'request.total',
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SlowRequest {
  path: string;
  method: string;
  duration: number;
  statusCode: number;
  requestId: string;
  timestamp: string;
}

// ─── Monitoring Metrics ─────────────────────────────────────────────────────

class MonitoringMetrics {
  private slowRequests: SlowRequest[] = [];
  private readonly maxSlowRequests = 50;
  private readonly slowThresholdMs = 500;

  /**
   * Record an error by its code.
   * Called from globalErrorHandler.
   */
  recordError(code: string): void {
    try {
      opsMetrics.inc(MONITORING.ERROR_CODE, { code });
    } catch {
      // fire-and-forget
    }
  }

  /**
   * Record an authentication failure.
   * Called from auth.controller.ts on login/refresh failures.
   */
  recordAuthFailure(reason: string): void {
    try {
      opsMetrics.inc(MONITORING.AUTH_FAILURE, { reason });
    } catch {
      // fire-and-forget
    }
  }

  /**
   * Record a slow API request.
   * Called from metricsMiddleware when duration > threshold.
   */
  recordSlowRequest(entry: SlowRequest): void {
    try {
      opsMetrics.inc(MONITORING.SLOW_API, { path: entry.path, method: entry.method });
      this.slowRequests.push(entry);
      if (this.slowRequests.length > this.maxSlowRequests) {
        this.slowRequests.shift();
      }
    } catch {
      // fire-and-forget
    }
  }

  /**
   * Record a request completion.
   * Called from metricsMiddleware on every response finish.
   */
  recordRequest(method: string, path: string, statusCode: number): void {
    try {
      opsMetrics.inc(MONITORING.REQUEST_TOTAL, { method, status: String(statusCode) });
    } catch {
      // fire-and-forget
    }
  }

  /**
   * Get recent slow requests (ring buffer).
   */
  getSlowRequests(): SlowRequest[] {
    return [...this.slowRequests];
  }

  /**
   * Current slow API threshold in ms.
   */
  get slowThreshold(): number {
    return this.slowThresholdMs;
  }

  /**
   * Reset slow request buffer.
   * Note: opsMetrics counters persist until server restart or periodic flush.
   */
  reset(): void {
    this.slowRequests = [];
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const monitoringMetrics = new MonitoringMetrics();
