import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import type { EntityManager } from 'typeorm';

export interface BrowserSessionClaims {
  serviceKey?: string | null;
  sessionId?: string | null;
  tokenFamily?: string | null;
}

/** Signed browser identity and the account's current security family are both required. */
export async function isBrowserSessionLive(
  userId: string,
  claims: BrowserSessionClaims,
  currentFamily?: string | null,
  manager: Pick<EntityManager, 'query'> = AppDataSource.manager,
): Promise<boolean> {
  if (!claims.serviceKey || !claims.tokenFamily ||
      !claims.sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sessionId)) return false;
  if (currentFamily !== undefined && (!currentFamily || currentFamily !== claims.tokenFamily)) return false;
  // Read the account generation and browser revocation in one snapshot, even when
  // a caller already loaded a User before a concurrent password change committed.
  const rows = await manager.query(
    `SELECT 1 FROM users u WHERE u.id = $1 AND u."refreshTokenFamily" = $4
     AND NOT EXISTS (SELECT 1 FROM browser_session_revocations r
       WHERE r.user_id = u.id AND r.service_key = $2 AND r.session_id = $3
       AND r.expires_at > now())`,
    [userId, claims.serviceKey, claims.sessionId, claims.tokenFamily],
  );
  return rows.length > 0;
}

/** Seven-day refresh TTL plus an issuance margin for requests already in flight at logout. */
export async function revokeBrowserSession(
  userId: string, serviceKey: string, sessionId: string,
  manager: Pick<EntityManager, 'query'> = AppDataSource.manager,
): Promise<void> {
  await manager.query(
    `INSERT INTO browser_session_revocations (user_id, service_key, session_id, expires_at)
     VALUES ($1, $2, $3, now() + interval '8 days')
     ON CONFLICT (user_id, service_key, session_id) DO NOTHING`,
    [userId, serviceKey, sessionId],
  );
  // Bounded cleanup uses the expiry index and is independent of successful revocation.
  void manager.query(`DELETE FROM browser_session_revocations WHERE (user_id, service_key, session_id) IN (
    SELECT user_id, service_key, session_id FROM browser_session_revocations
    WHERE expires_at <= now() ORDER BY expires_at LIMIT 1000
  )`).catch(() => logger.warn('[Auth] Expired browser-session cleanup failed'));

}
