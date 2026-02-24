/**
 * Read Cache — Cache-aside pattern for read-heavy queries
 *
 * WO-O4O-REDIS-READ-CACHE-LAYER-V1
 * WO-O4O-GA-PRELAUNCH-VERIFICATION-V1 (key harden, DTO safety)
 *
 * Principles:
 * - Read-only: never touches write paths
 * - Graceful: cache miss falls back to DB with zero disruption
 * - TTL-only: no active invalidation
 * - Uses redis.guard.ts (single source of truth for Redis connections)
 * - All consumers use dataSource.query() (raw SQL) → plain objects only
 */

import { createHash } from 'crypto';
import { getRedisClient } from '../infrastructure/redis.guard.js';
import logger from '../utils/logger.js';
import { opsMetrics, OPS } from '../services/ops-metrics.service.js';

const RC_PREFIX = 'rc';

/**
 * Build a collision-safe cache key.
 *
 * 1. Sort params by key
 * 2. Strip undefined values
 * 3. JSON.stringify
 * 4. SHA1 → first 12 hex chars
 *
 * Result: `{prefix}:{sha1_12}`
 */
export function hashCacheKey(
  prefix: string,
  params: Record<string, unknown>,
): string {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    if (params[key] !== undefined) {
      sorted[key] = params[key];
    }
  }
  const hash = createHash('sha1')
    .update(JSON.stringify(sorted))
    .digest('hex')
    .slice(0, 12);
  return `${prefix}:${hash}`;
}

/**
 * Cache-aside wrapper.
 *
 * 1. Try Redis GET
 * 2. If miss or error → execute fetchFn
 * 3. Write result to Redis (fire-and-forget, non-blocking)
 *
 * If Redis is not configured/available, fetchFn runs directly.
 *
 * Safety: fetchFn must return JSON-serializable plain objects.
 * All current consumers use dataSource.query() (raw SQL) which
 * returns plain JS objects — no TypeORM Entity proxies.
 */
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const fullKey = `${RC_PREFIX}:${key}`;
  const client = getRedisClient();

  // 1. Try cache
  if (client) {
    try {
      const cached = await client.get(fullKey);
      if (cached !== null) {
        opsMetrics.inc(OPS.CACHE_HIT);
        logger.debug(`[ReadCache] HIT ${key}`);
        return JSON.parse(cached) as T;
      }
      opsMetrics.inc(OPS.CACHE_MISS);
      logger.debug(`[ReadCache] MISS ${key}`);
    } catch (err) {
      opsMetrics.inc(OPS.CACHE_ERROR);
      logger.warn('[ReadCache] GET error, falling back to DB', {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Fetch from DB
  const data = await fetchFn();

  // 3. Write-behind (fire-and-forget)
  if (client) {
    client
      .setex(fullKey, ttlSeconds, JSON.stringify(data))
      .catch((err) => {
        opsMetrics.inc(OPS.CACHE_ERROR);
        logger.warn('[ReadCache] SET error', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  return data;
}

/** TTL constants (seconds) */
export const READ_CACHE_TTL = {
  STOREFRONT: 60,     // B2C product queries
  HUB_KPI: 30,        // Hub dashboard summaries
  CATALOG: 120,        // Catalog/category queries
} as const;
