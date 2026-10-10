import { createHash, randomBytes } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { invalidSocialFlow } from './social-auth-error.js';

export type SocialProvider = 'google' | 'kakao';
export type SocialFlowKind = 'kakao-login' | 'kakao-signup' | 'link-reauth' | 'link-permit' | 'link-proof' | 'link-confirm';
export type SocialQuery = Pick<EntityManager, 'query'>;
export interface SocialFlowOwner { userId: string; sessionId: string; tokenFamily: string }
export interface SocialFlow {
  token_hash: string; binding_hash: string; kind: SocialFlowKind; origin: string; service_key: string;
  provider: SocialProvider; user_id: string | null; session_id: string | null; token_family: string | null;
  payload: Record<string, unknown>; created_at: Date; expires_at: Date; used_at: Date | null;
}
export const socialDigest = (value: string) => createHash('sha256').update(value).digest('hex');
export const socialCookieName = (token: string) => `o4o_social_${socialDigest(token).slice(0,16)}`;
const rowResult = (result: unknown): SocialFlow[] => {
  const data = result as unknown[];
  return (Array.isArray(data[0]) ? data[0] : data) as SocialFlow[];
};

/** Short, hashed, one-use grants. Concurrent consume is serialized by UPDATE ... WHERE used_at IS NULL. */
export class SocialFlowService {
  constructor(private readonly db: SocialQuery = AppDataSource) {}
  async create(kind: SocialFlowKind, provider: SocialProvider, origin: string, serviceKey: string,
    payload: Record<string, unknown> = {}, owner?: SocialFlowOwner, manager: SocialQuery = this.db) {
    const token = randomBytes(32).toString('base64url'); const binding = randomBytes(32).toString('base64url');
    await manager.query(`DELETE FROM public.auth_social_flows WHERE token_hash IN
      (SELECT token_hash FROM public.auth_social_flows WHERE expires_at < now() LIMIT 1000)`);
    await manager.query(`INSERT INTO public.auth_social_flows
      (token_hash,binding_hash,kind,provider,origin,service_key,user_id,session_id,token_family,payload,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,now()+interval '5 minutes')`,
      [socialDigest(token),socialDigest(binding),kind,provider,origin,serviceKey,owner?.userId??null,
        owner?.sessionId??null,owner?.tokenFamily??null,JSON.stringify(payload)]);
    return { token, binding };
  }

  async read(token: string, manager: SocialQuery = this.db): Promise<SocialFlow> {
    this.validateToken(token);
    const rows: SocialFlow[] = await manager.query(`SELECT * FROM public.auth_social_flows
      WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()`, [socialDigest(token)]);
    if (!rows[0]) throw invalidSocialFlow();
    return rows[0];
  }

  async consume(token: string, binding: string, kind: SocialFlowKind, origin: string,
    owner?: SocialFlowOwner, manager: SocialQuery = this.db): Promise<SocialFlow> {
    this.validateToken(token); this.validateToken(binding);
    const rows = rowResult(await manager.query(`UPDATE public.auth_social_flows SET used_at=now()
      WHERE token_hash=$1 AND binding_hash=$2 AND kind=$3 AND origin=$4 AND used_at IS NULL AND expires_at>now()
        AND user_id IS NOT DISTINCT FROM $5::uuid AND session_id IS NOT DISTINCT FROM $6::uuid
        AND token_family IS NOT DISTINCT FROM $7
      RETURNING *`,[socialDigest(token),socialDigest(binding),kind,origin,owner?.userId??null,owner?.sessionId??null,owner?.tokenFamily??null]));
    if (!rows[0]) throw invalidSocialFlow();
    return rows[0];
  }

  private validateToken(value: string): void {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw invalidSocialFlow();
  }
}
export const socialFlowService = new SocialFlowService();
