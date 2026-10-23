import type { DataSource } from 'typeorm';
import type { User } from '../../entities/User.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import { normalizeLoginEmail } from '@o4o/auth-utils';
import logger from '../../utils/logger.js';
import { hashToken, newPlainToken, TOKEN_TABLE, type Queryable, type TokenKind } from './email-auth.shared.js';

interface TokenUser {
  email: string;
  token_family: string | null;
  email_verified: boolean;
  account_active: boolean;
  status: string;
}

interface ConsumedToken { user_id: string; email: string }

/** CORE_CHANGE: TODO-O4O-AUTH-TOKEN-MEMBERSHIP-HARDENING-V1.
 * All token writes/consumption use the same user-row lock as password changes.
 * A prepared token stays consumed until delivery is confirmed; SMTP holds no DB lock.
 */
export class EmailAuthTokenService {
  constructor(
    private readonly dataSource: () => Pick<DataSource, 'query' | 'transaction'>,
    private readonly now: () => Date,
  ) {}

  private async lockUser(manager: Queryable, userId: string): Promise<TokenUser | undefined> {
    const rows: TokenUser[] = await manager.query(
      `SELECT email, "refreshTokenFamily" AS token_family, "isEmailVerified" AS email_verified,
              "isActive" AS account_active, status
         FROM users WHERE id = $1 FOR UPDATE`, [userId],
    );
    return rows[0];
  }

  private usable(user: TokenUser | undefined, expectedEmail: string, kind: TokenKind): user is TokenUser {
    return !!user && user.account_active && resolveAccountAccess(user.status) !== 'blocked' &&
      normalizeLoginEmail(user.email) === normalizeLoginEmail(expectedEmail) &&
      (kind !== 'verification' || !user.email_verified);
  }

  async send(
    kind: TokenKind, user: User, ttlMs: number,
    deliver: (plainToken: string) => Promise<{ success: boolean }>,
  ): Promise<boolean> {
    const table = TOKEN_TABLE[kind];
    const plain = newPlainToken();
    const digest = hashToken(plain);
    const expiresAt = new Date(this.now().getTime() + ttlMs);
    const prepared = await this.dataSource().transaction(async manager => {
      const current = await this.lockUser(manager, user.id);
      if (!this.usable(current, user.email, kind)) return null;
      // Do not delete unexpired consumed rows: another delivery may still be in flight.
      await manager.query(`DELETE FROM ${table} WHERE user_id = $1 AND expires_at < now()`, [user.id]);
      if (kind === 'verification') {
        await manager.query(
          `INSERT INTO email_verification_tokens (user_id, email, token_hash, expires_at, consumed_at)
           VALUES ($1, $2, $3, $4, now())`, [user.id, normalizeLoginEmail(current.email), digest, expiresAt],
        );
      } else {
        await manager.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, consumed_at)
           VALUES ($1, $2, $3, now())`, [user.id, digest, expiresAt],
        );
      }
      return { family: current.token_family, email: current.email };
    });
    if (!prepared) return false;

    const discard = () => this.dataSource().query(
      `DELETE FROM ${table} WHERE token_hash = $1 AND consumed_at IS NOT NULL`, [digest],
    );
    let delivered: boolean;
    try {
      delivered = (await deliver(plain)).success === true;
    } catch {
      // Provider errors may contain the URL/token or recipient. Keep values out of logs.
      logger.warn(`[EmailAuth] ${kind} mail failed`);
      await discard();
      return false;
    }
    if (!delivered) {
      logger.warn(`[EmailAuth] ${kind} mail not sent`);
      await discard();
      return false;
    }

    try {
      return await this.dataSource().transaction(async manager => {
        const current = await this.lockUser(manager, user.id);
        // A password change/reset while SMTP was pending must win over this old request.
        if (!this.usable(current, prepared.email, kind) || current.token_family !== prepared.family) {
          await manager.query(`DELETE FROM ${table} WHERE token_hash = $1 AND consumed_at IS NOT NULL`, [digest]);
          return false;
        }
        const activated = this.rows(await manager.query(
          `UPDATE ${table} SET consumed_at = NULL
            WHERE token_hash = $1 AND consumed_at IS NOT NULL AND expires_at > now()
            RETURNING user_id`, [digest],
        ));
        if (!activated.length) return false;
        // Activation and retirement commit together. Only one delivered link is live.
        await manager.query(
          `UPDATE ${table} SET consumed_at = now()
            WHERE user_id = $1 AND token_hash <> $2 AND consumed_at IS NULL`, [user.id, digest],
        );
        return true;
      });
    } catch (error) {
      await discard().catch(() => logger.warn('[EmailAuth] prepared token cleanup failed'));
      throw error;
    }
  }

  /** Caller owns the account update transaction; user-before-token order avoids deadlocks. */
  async consume(kind: TokenKind, plain: string, manager: Queryable): Promise<ConsumedToken | null> {
    if (typeof plain !== 'string' || plain.length < 20 || plain.length > 200) return null;
    const table = TOKEN_TABLE[kind];
    const digest = hashToken(plain);
    const candidates: { user_id: string }[] = await manager.query(
      `SELECT user_id FROM ${table}
        WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()`, [digest],
    );
    if (!candidates[0] || !await this.lockUser(manager, candidates[0].user_id)) return null;
    const returning = kind === 'verification' ? 'user_id, email' : `user_id, '' AS email`;
    return this.rows(await manager.query(
      `UPDATE ${table} SET consumed_at = now()
        WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
        RETURNING ${returning}`, [digest],
    ))[0] ?? null;
  }

  /** TypeORM's PostgreSQL UPDATE RETURNING uses [rows, affected]. */
  private rows(result: unknown): ConsumedToken[] {
    return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as ConsumedToken[];
  }
}
