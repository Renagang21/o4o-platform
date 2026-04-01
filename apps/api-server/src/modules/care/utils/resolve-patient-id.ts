/**
 * resolvePatientUserId — glucoseview_customers.id → users.id 변환
 *
 * Care API에서 patientId 파라미터로 glucoseview_customers.id 또는 users.id가
 * 올 수 있다. health_readings.patient_id는 users.id 기준이므로 변환 필요.
 *
 * 로직:
 * 1. glucoseview_customers에서 id로 검색 → user_id 반환
 * 2. 없으면 원래 값 그대로 반환 (이미 users.id인 경우)
 */

import type { DataSource } from 'typeorm';

export async function resolvePatientUserId(
  dataSource: DataSource,
  patientId: string,
): Promise<string> {
  const result = await dataSource.query(
    `SELECT user_id FROM glucoseview_customers WHERE id = $1 AND user_id IS NOT NULL LIMIT 1`,
    [patientId],
  );
  if (result.length > 0 && result[0].user_id) {
    return result[0].user_id;
  }
  return patientId;
}
