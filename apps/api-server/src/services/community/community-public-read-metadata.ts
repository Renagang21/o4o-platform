import type { EntityManager } from 'typeorm';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const PUBLIC_READ_KEY = 'o4oCommunityPublicReadV1';
interface Designation {
  mode: 'private' | 'board' | 'selected';
  postIds: string[];
  designatedBy: string;
  designatedAt: string;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROOF_VERSION = 'operator-v1';

function digest(communityKey: string, boardId: string, setting: Designation, secret: string) {
  // Domain separation; a proof cannot move to another community/board or change scope.
  const message = JSON.stringify([PROOF_VERSION, communityKey, boardId.toLowerCase(), setting.mode,
    [...setting.postIds].sort(), setting.designatedBy, setting.designatedAt]);
  return createHmac('sha256', secret).update('o4o/community-public-read/v1\0').update(message).digest();
}

export function signPublicReadDesignation(communityKey: string, boardId: string, setting: Designation, secret: string) {
  if (!secret.trim()) throw new Error('Public read signing key unavailable');
  return { ...setting, proofVersion: PROOF_VERSION, proof: digest(communityKey, boardId, setting, secret).toString('hex') };
}

/** Historical applicant metadata and copied/tampered proofs remain private. */
export function hasAuthenticPublicReadDesignation(communityKey: string, boardId: string, value: unknown, secret: string | undefined) {
  if (!secret?.trim() || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const setting = value as Record<string, unknown>;
  if (setting.proofVersion !== PROOF_VERSION || typeof setting.proof !== 'string' || !/^[a-f0-9]{64}$/.test(setting.proof) ||
      typeof setting.mode !== 'string' || !['private', 'board', 'selected'].includes(setting.mode) || !Array.isArray(setting.postIds) ||
      setting.postIds.length > 100 || setting.postIds.some(id => typeof id !== 'string' || !UUID.test(id)) ||
      (setting.mode !== 'selected' && setting.postIds.length > 0) ||
      typeof setting.designatedBy !== 'string' || !setting.designatedBy || setting.designatedBy.length > 128 ||
      typeof setting.designatedAt !== 'string' || setting.designatedAt.length > 64 || !Number.isFinite(Date.parse(setting.designatedAt))) return false;
  const expected = digest(communityKey, boardId, setting as unknown as Designation, secret);
  return timingSafeEqual(expected, Buffer.from(setting.proof, 'hex'));
}

/** Applicant-controlled metadata cannot designate public content. */
export function withoutPublicReadDesignation(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;
  const result = { ...metadata };
  delete result[PUBLIC_READ_KEY];
  return result;
}

/** Merge ordinary lifecycle metadata against the current row, never replay a designation. */
export async function mergeForumMetadataPatch(
  exec: Pick<EntityManager, 'query'>, id: string, serviceCode: string,
  patch: Record<string, unknown>, status?: 'completed' | 'archived',
) {
  const values: unknown[] = [id, serviceCode, JSON.stringify(withoutPublicReadDesignation(patch))];
  const statusSet = status ? ', status = $4' : '';
  if (status) values.push(status);
  await exec.query(`UPDATE forum_category_requests
    SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
        updated_at = NOW()${statusSet}
    WHERE id = $1::uuid AND service_code = $2`, values);
}
