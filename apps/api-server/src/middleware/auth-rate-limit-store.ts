import { createHash } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import type { EntityManager, DataSource } from 'typeorm';
import logger from '../utils/logger.js';

type Database = Pick<DataSource, 'transaction'>;
export type AuthLimitLease = { scope: string; digest: string; hits: number; resetAt: Date; now: Date };

/** Shared auth counters contain digests only, never IPs, names, phone numbers or login IDs. */
export class PostgresAuthRateLimitStore {
  private nextCleanup = 0;
  constructor(private readonly database: () => Promise<Database>) {}

  private async bounded<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return (await this.database()).transaction(async manager => {
      await manager.query("SET LOCAL statement_timeout = '2s'");
      await manager.query("SET LOCAL lock_timeout = '1s'");
      return work(manager);
    });
  }

  async reserve(scope: string, key: string, windowMs: number): Promise<AuthLimitLease> {
    const digest = createHash('sha256').update(scope).update('\0').update(key).digest('hex');
    const row = await this.bounded(async manager => {
      const [result] = await manager.query(`INSERT INTO public.auth_rate_limit_counters(scope,key_digest,hits,reset_at)
        VALUES($1,$2,1,date_trunc('milliseconds',statement_timestamp()) + $3 * interval '1 millisecond')
        ON CONFLICT(scope,key_digest) DO UPDATE SET
          hits=CASE WHEN auth_rate_limit_counters.reset_at <= statement_timestamp() THEN 1
            ELSE LEAST(auth_rate_limit_counters.hits::bigint+1,2147483647)::integer END,
          reset_at=CASE WHEN auth_rate_limit_counters.reset_at <= statement_timestamp()
            THEN date_trunc('milliseconds',statement_timestamp()) + $3 * interval '1 millisecond'
            ELSE auth_rate_limit_counters.reset_at END
        RETURNING hits,reset_at,date_trunc('milliseconds',statement_timestamp()) AS now`, [scope,digest,windowMs]);
      return result;
    });
    // Opportunistic, bounded maintenance: no dependency on a live timer or a new scheduler.
    if (Date.now() >= this.nextCleanup) {
      this.nextCleanup = Date.now() + 60_000;
      try {
        await this.bounded(manager => manager.query(`DELETE FROM public.auth_rate_limit_counters WHERE (scope,key_digest) IN
          (SELECT scope,key_digest FROM public.auth_rate_limit_counters WHERE reset_at <= statement_timestamp()
            ORDER BY reset_at LIMIT 200 FOR UPDATE SKIP LOCKED)`));
      } catch { logger.warn('[auth-rate-limit] expired counter maintenance unavailable'); }
    }
    return { scope,digest,hits:Number(row.hits),resetAt:new Date(row.reset_at),now:new Date(row.now) };
  }

  async release(lease: AuthLimitLease): Promise<void> {
    // A slow successful response must never decrement a later window's failures.
    await this.bounded(manager => manager.query(`UPDATE public.auth_rate_limit_counters SET hits=GREATEST(hits-1,0)
      WHERE scope=$1 AND key_digest=$2 AND reset_at=$3`, [lease.scope,lease.digest,lease.resetAt]));
  }
}

export interface SharedAuthLimitOptions {
  scope: string;
  windowMs: number;
  max: number;
  message: string;
  key: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
}

export function sharedAuthLimiter(store: PostgresAuthRateLimitStore, options: SharedAuthLimitOptions): RequestHandler {
  return async (req, res, next) => {
    let lease: AuthLimitLease;
    try { lease = await store.reserve(options.scope,options.key(req),options.windowMs); }
    catch {
      res.status(503).json({ success:false,code:'AUTH_RATE_LIMIT_UNAVAILABLE',error:'인증 요청 제한을 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' });
      return;
    }
    const remaining = Math.max(0,options.max-lease.hits);
    const reset = Math.max(1,Math.ceil((lease.resetAt.getTime()-lease.now.getTime())/1000));
    res.setHeader('RateLimit-Limit',options.max);
    res.setHeader('RateLimit-Remaining',remaining);
    res.setHeader('RateLimit-Reset',reset);
    res.setHeader('RateLimit-Policy',`${options.max};w=${Math.ceil(options.windowMs/1000)}`);
    if (lease.hits > options.max) {
      res.setHeader('Retry-After',reset);
      res.status(429).json({ success:false,error:options.message,code:'RATE_LIMITED' });
      return;
    }
    if (options.skipSuccessfulRequests) {
      res.once('finish', () => {
        if (res.statusCode < 400) {
          void store.release(lease).catch(() => logger.warn('[auth-rate-limit] successful request counter release unavailable'));
        }
      });
    }
    next();
  };
}

export const authRateLimitStore = new PostgresAuthRateLimitStore(async () => {
  const { AppDataSource } = await import('../database/connection.js');
  if (!AppDataSource.isInitialized) throw new Error('AUTH_RATE_LIMIT_DATABASE_UNAVAILABLE');
  return AppDataSource;
});
