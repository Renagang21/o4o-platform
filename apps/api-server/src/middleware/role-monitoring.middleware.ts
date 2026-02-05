/**
 * Role Monitoring Middleware
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0
 *
 * Monitors role usage during the migration period and collects metrics.
 * Logs when legacy vs prefixed roles are accessed, helping track migration progress.
 *
 * ⚠️ MIGRATION PERIOD ONLY - Remove after migration complete (Phase 7)
 */

import type { Request, Response, NextFunction } from 'express';
import { getRoleMigrationStatus, isPrefixedRole } from '../utils/role.utils.js';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';

/**
 * Role usage metrics (in-memory for current session)
 */
interface RoleUsageMetrics {
  totalRequests: number;
  requestsWithPrefixedRoles: number;
  requestsWithLegacyRoles: number;
  requestsWithMixedRoles: number;
  legacyRoleUsage: Record<string, number>;
  prefixedRoleUsage: Record<string, number>;
}

const metrics: RoleUsageMetrics = {
  totalRequests: 0,
  requestsWithPrefixedRoles: 0,
  requestsWithLegacyRoles: 0,
  requestsWithMixedRoles: 0,
  legacyRoleUsage: {},
  prefixedRoleUsage: {}
};

/**
 * Log role usage for a request
 */
function logRoleUsage(req: AuthRequest): void {
  const user = req.user;
  if (!user) return;

  const userRoles = user.roles || [];
  if (userRoles.length === 0) return;

  metrics.totalRequests++;

  const migrationStatus = getRoleMigrationStatus(userRoles);

  // Categorize request by role format
  if (migrationStatus.migrationComplete) {
    // All prefixed
    metrics.requestsWithPrefixedRoles++;
  } else if (migrationStatus.prefixed === 0) {
    // All legacy
    metrics.requestsWithLegacyRoles++;
  } else {
    // Mixed format
    metrics.requestsWithMixedRoles++;
  }

  // Track individual role usage
  for (const role of userRoles) {
    if (isPrefixedRole(role)) {
      metrics.prefixedRoleUsage[role] = (metrics.prefixedRoleUsage[role] || 0) + 1;
    } else {
      metrics.legacyRoleUsage[role] = (metrics.legacyRoleUsage[role] || 0) + 1;
    }
  }

  // Log warning if legacy roles are used
  if (migrationStatus.legacy > 0) {
    const legacyRoles = userRoles.filter(r => !isPrefixedRole(r));
    logger.warn(
      `[ROLE_MONITORING] Legacy role format detected | User: ${user.id} | ` +
      `Roles: [${legacyRoles.join(', ')}] | Path: ${req.method} ${req.path}`
    );
  }
}

/**
 * Middleware: Monitor role usage
 *
 * Attach this middleware to track role usage across requests.
 * Does not modify request behavior - monitoring only.
 *
 * @example
 * app.use(roleMonitoringMiddleware);
 */
export function roleMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthRequest;

  // Log role usage if user is authenticated
  if (authReq.user) {
    logRoleUsage(authReq);
  }

  next();
}

/**
 * Get current role usage metrics
 *
 * Use this to expose metrics via an admin endpoint.
 *
 * @returns Current metrics snapshot
 *
 * @example
 * router.get('/admin/role-metrics', (req, res) => {
 *   res.json(getRoleUsageMetrics());
 * });
 */
export function getRoleUsageMetrics(): RoleUsageMetrics {
  return { ...metrics };
}

/**
 * Reset role usage metrics
 *
 * Useful for testing or periodic metric resets.
 */
export function resetRoleUsageMetrics(): void {
  metrics.totalRequests = 0;
  metrics.requestsWithPrefixedRoles = 0;
  metrics.requestsWithLegacyRoles = 0;
  metrics.requestsWithMixedRoles = 0;
  metrics.legacyRoleUsage = {};
  metrics.prefixedRoleUsage = {};
}

/**
 * Print role usage metrics summary
 *
 * Useful for debugging or periodic logging.
 */
export function printRoleUsageMetrics(): void {
  logger.info('\n═══════════════════════════════════════════════════════════════');
  logger.info('                  ROLE USAGE METRICS                           ');
  logger.info('═══════════════════════════════════════════════════════════════');

  logger.info('\n📊 REQUEST STATISTICS');
  logger.info('─────────────────────────────────────────────────────────────');
  logger.info(`Total Requests:               ${metrics.totalRequests}`);
  logger.info(`Requests with Prefixed Roles: ${metrics.requestsWithPrefixedRoles}`);
  logger.info(`Requests with Legacy Roles:   ${metrics.requestsWithLegacyRoles}`);
  logger.info(`Requests with Mixed Roles:    ${metrics.requestsWithMixedRoles}`);

  if (metrics.totalRequests > 0) {
    const prefixedPct = ((metrics.requestsWithPrefixedRoles / metrics.totalRequests) * 100).toFixed(1);
    const legacyPct = ((metrics.requestsWithLegacyRoles / metrics.totalRequests) * 100).toFixed(1);
    const mixedPct = ((metrics.requestsWithMixedRoles / metrics.totalRequests) * 100).toFixed(1);

    logger.info(`\nMigration Progress: ${prefixedPct}% prefixed, ${legacyPct}% legacy, ${mixedPct}% mixed`);
  }

  // Top legacy roles
  const legacyRoles = Object.entries(metrics.legacyRoleUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (legacyRoles.length > 0) {
    logger.info('\n❌ TOP LEGACY ROLES (Most Used):');
    logger.info('─────────────────────────────────────────────────────────────');
    for (const [role, count] of legacyRoles) {
      logger.info(`  ${role.padEnd(25)} → ${count} requests`);
    }
  }

  // Top prefixed roles
  const prefixedRoles = Object.entries(metrics.prefixedRoleUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (prefixedRoles.length > 0) {
    logger.info('\n✅ TOP PREFIXED ROLES (Most Used):');
    logger.info('─────────────────────────────────────────────────────────────');
    for (const [role, count] of prefixedRoles) {
      logger.info(`  ${role.padEnd(25)} → ${count} requests`);
    }
  }

  logger.info('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Schedule periodic metric logging
 *
 * Automatically logs metrics every N minutes.
 *
 * @param intervalMinutes - How often to log metrics (default: 60 minutes)
 *
 * @example
 * schedulePeriodicMetricLogging(30); // Log every 30 minutes
 */
export function schedulePeriodicMetricLogging(intervalMinutes: number = 60): NodeJS.Timeout {
  const intervalMs = intervalMinutes * 60 * 1000;

  const timer = setInterval(() => {
    if (metrics.totalRequests > 0) {
      logger.info(`\n[ROLE_MONITORING] Periodic metrics report (every ${intervalMinutes} minutes):`);
      printRoleUsageMetrics();
    }
  }, intervalMs);

  logger.info(`[ROLE_MONITORING] Scheduled periodic logging every ${intervalMinutes} minutes`);

  return timer;
}

/**
 * Middleware: Log legacy role usage warnings
 *
 * This is a stricter version that logs every legacy role usage.
 * Use during later migration phases to identify stragglers.
 *
 * @example
 * app.use(strictLegacyRoleLogging);
 */
export function strictLegacyRoleLogging(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthRequest;

  if (authReq.user) {
    const userRoles = authReq.user.roles || [];
    const legacyRoles = userRoles.filter(r => !isPrefixedRole(r));

    if (legacyRoles.length > 0) {
      logger.warn(
        `[STRICT_ROLE_CHECK] Legacy roles detected!`,
        `\n  User ID: ${authReq.user.id}`,
        `\n  Email: ${authReq.user.email}`,
        `\n  Legacy Roles: [${legacyRoles.join(', ')}]`,
        `\n  All Roles: [${userRoles.join(', ')}]`,
        `\n  Endpoint: ${req.method} ${req.path}`,
        `\n  Time: ${new Date().toISOString()}`
      );
    }
  }

  next();
}
