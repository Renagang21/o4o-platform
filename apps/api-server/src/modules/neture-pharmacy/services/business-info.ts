import { NeturePharmacyError } from '../constants.js';

/** Application metadata only. Access to materials/forums remains independently guarded. */
export async function getBusinessInfo(exec: { query(sql: string, params: unknown[]): Promise<any[]> }, key: string) {
  const [business] = await exec.query(
    `SELECT key, name, community_key AS "communityKey", registration_conditions AS "registrationConditions"
       FROM semi_franchises WHERE key = $1 AND status = 'active' LIMIT 1`, [key],
  );
  if (!business) throw new NeturePharmacyError(404, 'BUSINESS_NOT_FOUND', '운영 중인 약국 협력사업을 찾을 수 없습니다.');
  return { key: business.key, name: business.name, communityKey: business.communityKey ?? null,
    registrationConditions: business.registrationConditions ?? null };
}
