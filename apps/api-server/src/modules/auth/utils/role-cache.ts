/**
 * @core O4O_PLATFORM_CORE — Auth
 * Role Cache: per-process in-memory TTL cache for /auth/me hot path.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 * Source: WO-O4O-AUTH-ROLE-FRESHEN-V1
 *
 * Why:
 *   /auth/me is called on every page load / focus across all O4O services.
 *   Querying role_assignments on every call would multiply Cloud SQL load,
 *   but reading from JWT payload made role changes invisible until token refresh.
 *
 * Behavior:
 *   - 60s TTL keyed by userId
 *   - Cache miss falls through to DB (caller's responsibility)
 *   - Explicit invalidation on assignRole / removeRole / removeAllRoles
 *   - Per-process: multi-instance Cloud Run accepts <=60s eventual consistency
 */

const TTL_MS = 60 * 1000;

interface Entry {
  roles: string[];
  expiresAt: number;
}

const cache = new Map<string, Entry>();

export function getCachedRoles(userId: string): string[] | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.roles;
}

export function setCachedRoles(userId: string, roles: string[]): void {
  cache.set(userId, { roles, expiresAt: Date.now() + TTL_MS });
}

export function invalidateRoles(userId: string): void {
  cache.delete(userId);
}
