import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { readServiceFeatures, validateServiceFeatures, type PharmacyServiceFeature } from './service-features.js';

type Executor = Pick<DataSource, 'query'>;
// Compatibility is deliberately fixed: a future feature must not authorize legacy staff automatically.
const legacyStaffFeatures: PharmacyServiceFeature[] = ['tablet', 'multilingual-content', 'store-staff-support'];
export function readStaffFeatures(value: unknown, configured = value != null): PharmacyServiceFeature[] {
  if (!configured) return [...legacyStaffFeatures];
  if (!Array.isArray(value)) throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '근무자 이용 설정을 확인하지 못했습니다. 다시 시도해 주세요.');
  return readServiceFeatures(value);
}

export async function resolveStaffFeatures(db: Executor, userId: string, organizationId: string) {
  const rows = await db.query(`SELECT role, metadata->'pharmacyServiceFeatures' AS features, metadata ? 'pharmacyServiceFeatures' AS configured
    FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL`, [organizationId, userId]);
  if (rows.length !== 1) throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '매장 소속을 확인하지 못했습니다. 다시 시도해 주세요.');
  if (['owner', 'admin', 'manager'].includes(rows[0].role)) return null;
  if (rows[0].role !== 'staff') throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '승인된 근무자만 이용할 수 있습니다.');
  return readStaffFeatures(rows[0].features, rows[0].configured === true);
}

/** The caller must resolve the owner's store. Updates cannot create a relationship or change its role. */
export async function saveStaffFeatures(db: Executor, organizationId: string, userId: string,
  input: unknown, available: readonly PharmacyServiceFeature[], pending = false) {
  const features = validateServiceFeatures(input);
  if (features.some(feature => !available.includes(feature))) {
    throw new NeturePharmacyError(400, 'FEATURE_NOT_AVAILABLE', '현재 약국에서 이용 가능한 기능만 허용할 수 있습니다.');
  }
  const result = await db.query(`UPDATE organization_members
    SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{pharmacyServiceFeatures}',$3::jsonb,true), updated_at=NOW()
    WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL AND role=$4 RETURNING user_id`,
  [organizationId, userId, JSON.stringify(features), pending ? 'accepted' : 'staff']);
  const rows = Array.isArray(result[0]) ? result[0] : result;
  if (!rows.length) throw new NeturePharmacyError(404, 'STAFF_MEMBER_NOT_FOUND', '해당 매장의 근무자를 확인해 주세요.');
  return { organizationId, userId, serviceFeatures: features };
}
