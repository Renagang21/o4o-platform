/**
 * Slow Request Threshold Middleware
 *
 * WO-O4O-INTERNAL-BETA-ROLL-OUT-V1
 *
 * Logs a warning when API responses exceed configured thresholds.
 * Only active when BETA_MODE=true.
 *
 * Thresholds:
 * - /checkout:  700ms
 * - /payments/confirm: 1500ms
 * - All other:  1000ms
 *
 * No logic changes. Read-only observation.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { betaConfig } from '../config/app.config.js';

const THRESHOLDS: Array<{ pattern: RegExp; ms: number; label: string }> = [
  { pattern: /\/checkout/, ms: 700, label: 'checkout' },
  { pattern: /\/payments\/confirm/, ms: 1500, label: 'payment.confirm' },
];

const DEFAULT_THRESHOLD_MS = 1000;

export function slowThresholdMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!betaConfig.isEnabled()) {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Find matching threshold
    let thresholdMs = DEFAULT_THRESHOLD_MS;
    let label = 'api';
    for (const t of THRESHOLDS) {
      if (t.pattern.test(req.originalUrl)) {
        thresholdMs = t.ms;
        label = t.label;
        break;
      }
    }

    if (duration > thresholdMs) {
      logger.warn('[SlowRequest]', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        thresholdMs,
        label,
      });
    }
  });

  next();
}
