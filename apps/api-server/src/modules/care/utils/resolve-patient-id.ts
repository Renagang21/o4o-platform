/**
 * resolvePatientUserId — glucoseview_customers.id → users.id 변환
 *
 * Care API에서 patientId 파라미터로 glucoseview_customers.id 또는 users.id가
 * 올 수 있다. care_coaching_sessions.patient_id는 users.id 기준이므로 변환 필요.
 *
 * 로직:
 * 1. glucoseview_customers에서 id로 검색 → user_id 반환
 * 2. 없으면 users 테이블에서 직접 확인 (이미 users.id인 경우)
 * 3. 둘 다 아니면 null 반환 (호출자가 처리)
 *
 * WO-O4O-GLYCOPHARM-COACHING-PATIENT-ID-NORMALIZATION-FIX-V1
 */

import type { DataSource } from 'typeorm';

export interface ResolveResult {
  userId: string;
  source: 'gc_linked' | 'users_direct';
}

/**
 * 안전한 변환: 반드시 users.id를 반환하거나 null (변환 불가).
 * gc.user_id IS NULL인 경우 더 이상 gc.id를 그대로 반환하지 않는다.
 */
export async function resolvePatientUserIdStrict(
  dataSource: DataSource,
  patientId: string,
): Promise<ResolveResult | null> {
  // 1차: glucoseview_customers.id → user_id 변환
  const gcResult = await dataSource.query(
    `SELECT user_id FROM glucoseview_customers WHERE id = $1 AND user_id IS NOT NULL LIMIT 1`,
    [patientId],
  );
  if (gcResult.length > 0 && gcResult[0].user_id) {
    return { userId: gcResult[0].user_id, source: 'gc_linked' };
  }

  // 2차: 입력값이 이미 users.id인지 확인
  const userResult = await dataSource.query(
    `SELECT id FROM users WHERE id = $1 LIMIT 1`,
    [patientId],
  );
  if (userResult.length > 0) {
    return { userId: patientId, source: 'users_direct' };
  }

  // 변환 불가: gc.user_id IS NULL 이거나 존재하지 않는 ID
  return null;
}

/**
 * 하위 호환용: 기존 호출자가 string을 기대하는 경우.
 * 변환 실패 시에도 원본을 반환하되, 경고 로그를 남긴다.
 */
export async function resolvePatientUserId(
  dataSource: DataSource,
  patientId: string,
): Promise<string> {
  const result = await resolvePatientUserIdStrict(dataSource, patientId);
  if (result) {
    return result.userId;
  }
  console.warn(
    `[resolvePatientUserId] Cannot resolve "${patientId}" to users.id — glucoseview_customers.user_id may be NULL or record does not exist`,
  );
  return patientId;
}
