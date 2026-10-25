import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
type Executor = Pick<DataSource, 'query'>;

/** Store-scoped owner confirmation is not a new global licence verification record. */
export async function consultationProfessionalConfirmed(db: Executor, userId: string, organizationId: string) {
  try {
    const rows = await db.query(`SELECT
      EXISTS(SELECT 1 FROM organization_members WHERE user_id=$1 AND organization_id=$2 AND left_at IS NULL
        AND metadata ? 'pharmacyPharmacistConfirmed' AND jsonb_typeof(metadata->'pharmacyPharmacistConfirmed') IS DISTINCT FROM 'boolean') AS invalid,
      EXISTS(SELECT 1 FROM organization_members WHERE user_id=$1 AND organization_id=$2 AND left_at IS NULL
        AND role IN ('owner','staff') AND metadata->'pharmacyPharmacistConfirmed'='true'::jsonb) AS confirmed`, [userId, organizationId]);
    if (rows.length !== 1 || rows[0].invalid === true || typeof rows[0].confirmed !== 'boolean') throw new Error('Invalid confirmation');
    return rows[0].confirmed;
  } catch {
    throw new NeturePharmacyError(503, 'PROFESSIONAL_ACCESS_UNAVAILABLE', '약사 상담 사용 확인을 조회하지 못했습니다. 다시 시도해 주세요.');
  }
}

export async function confirmOwnerPharmacist(db: Executor, userId: string, organizationId: string, confirmed: unknown) {
  if (typeof confirmed !== 'boolean') throw new NeturePharmacyError(400, 'INVALID_PHARMACIST_CONFIRMATION', '약사 사용 확인 여부를 선택해 주세요.');
  const result = await db.query(`UPDATE organization_members
    SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{pharmacyPharmacistConfirmed}',$3::jsonb,true),updated_at=NOW()
    WHERE organization_id=$1 AND user_id=$2 AND role='owner' AND left_at IS NULL RETURNING user_id`,
  [organizationId, userId, JSON.stringify(confirmed)]);
  const rows = Array.isArray(result[0]) ? result[0] : result;
  if (!rows.length) throw new NeturePharmacyError(403, 'STORE_OWNER_REQUIRED', '경영자 본인의 약사 사용 확인만 변경할 수 있습니다.');
  return { organizationId, pharmacistConfirmed: confirmed };
}
