/**
 * 반려 가입 신청서 30일 정리 (2026-11-09 사용자 결정 — 반려 후 30일 안에 다시 신청하지 않으면 제출 정보를 정리한다).
 *
 * - 대상: Neture 가입 신청서(`users."businessInfo"` 의 `o4oMembershipRegistrationV1`) 중
 *   상태가 `rejected` 이고 반려 시각(`reviewedAt`)이 30일 넘게 지났으며 아직 제출 정보가 남은 것.
 *   회원이 다시 제출하면 상태가 `pending` 으로 바뀌므로 대상에서 빠진다.
 * - 정리: 제출 정보(`fields` — 면허번호 · 사업자 정보 · 사업자등록증 참조)만 비운다.
 *   상태 `rejected` · 유형 · 반려 사유 · 반려 시각은 남긴다 — 이 표식이 없어지면 가입 이전 회원(legacy)으로
 *   읽혀 승인 없이 이용 가능해지므로 지우지 않는다. 계정 자체는 지우지 않는다(계정 약관 v2 제6조 — 신청 반려 ≠ 계정 상태).
 * - 사업자등록증: 이 회원이 올린 문서이고 약국 · 공급자 사업체가 참조하지 않을 때만 `kyc_documents` 행을 지운다.
 *   저장소 파일은 **commit 전에** 지운다 — 파일 삭제가 실패하면 transaction 을 되돌려 제출 정보 · 문서 행(파일 위치)을 그대로 두고,
 *   다음 실행에서 다시 시도한다(PR #1003 Codex P2: commit 뒤에 지우면 실패 시 파일 위치가 사라져 다시 지울 수 없다).
 *   파일을 지운 뒤 commit 이 실패해도 다음 실행이 같은 위치를 다시 지운다(없는 파일은 성공으로 본다).
 * - 실행: `jobs/privacy-retention.job.ts` 가 `PRIVACY_RETENTION_MODE` 를 따른다 — `apply` 일 때만 쓰고, 그 밖에는 건수만 센다.
 *   로그에는 건수만 남긴다.
 */
import type { DataSource, EntityManager } from 'typeorm';
import { MEMBER_REGISTRATION_KEY, type MemberRegistration } from '@o4o/types';
import { writeRegistration } from './member-registration-data.js';

export const REJECTED_REGISTRATION_RETENTION_DAYS = 30;
const BATCH = 200;
const REG = `u."businessInfo"::jsonb->'${MEMBER_REGISTRATION_KEY}'`;
/** 반려 시각이 기한을 넘었고 제출 정보가 남은 신청서. reviewedAt 이 날짜 모양이 아니면 건드리지 않는다. */
const ELIGIBLE = `${REG}->>'state'='rejected'
  AND ${REG}->>'reviewedAt' ~ '^\\d{4}-\\d{2}-\\d{2}T'
  AND (${REG}->>'reviewedAt')::timestamptz <= $1
  AND jsonb_typeof(${REG}->'fields')='object' AND ${REG}->'fields'<>'{}'::jsonb`;

export interface RejectedRegistrationStorage {
  /** gcs://bucket/path 로 저장된 파일 하나를 지운다. 없으면 성공으로 본다. */
  deleteObject(fileUrl: string): Promise<void>;
}
export interface RejectedRegistrationReport { eligible: number; purged: number; documentsDeleted: number; failed: number }

export function rejectedRegistrationCutoff(now: Date, days = REJECTED_REGISTRATION_RETENTION_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function purgeOne(m: EntityManager, userId: string, cutoff: Date, storage?: RejectedRegistrationStorage): Promise<{ purged: boolean; documentDeleted: boolean }> {
  // 잠근 뒤 다시 판정한다: 그 사이 회원이 다시 제출했으면(pending) 건드리지 않는다.
  const [row] = await m.query(`SELECT ${REG} AS registration FROM users u WHERE u.id=$2 AND ${ELIGIBLE} FOR UPDATE`, [cutoff, userId]);
  const registration = row?.registration as MemberRegistration | undefined;
  if (!registration) return { purged: false, documentDeleted: false };
  const documentId = registration.fields?.businessRegistrationDocumentId ?? null;
  const { fields: _fields, ...kept } = registration;
  await writeRegistration(m, userId, { ...kept, fields: {}, fieldsPurgedAt: new Date().toISOString() } as MemberRegistration & { fieldsPurgedAt: string });
  let documentDeleted = false;
  if (documentId) {
    // 회원 본인의 사업자등록증이고, 약국 · 공급자 사업체가 쓰지 않는 경우만 지운다.
    const [doc] = await m.query(`DELETE FROM kyc_documents d
      WHERE d.id::text=$1 AND d.user_id=$2 AND d."documentType"='business_registration'
        AND NOT EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text)
        AND NOT EXISTS(SELECT 1 FROM neture_suppliers s WHERE s.business_registration_document_id=d.id)
      RETURNING d."fileUrl" AS "fileUrl"`, [documentId, userId]).then((result: unknown) => {
      // TypeORM postgres 는 DELETE ... RETURNING 결과를 [rows, count] 로 돌려준다.
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      return Array.isArray(rows) ? rows : [];
    });
    const fileUrl: string | null = doc?.fileUrl ?? null;
    if (fileUrl) {
      // commit 전에 지운다. 실패하면 throw → rollback 되어 다음 실행에서 다시 시도한다.
      if (!storage) throw new Error('DOCUMENT_STORAGE_UNAVAILABLE');
      await storage.deleteObject(fileUrl);
      documentDeleted = true;
    }
  }
  return { purged: true, documentDeleted };
}

export async function purgeRejectedRegistrations(
  db: DataSource,
  now: Date,
  apply: boolean,
  storage?: RejectedRegistrationStorage,
): Promise<RejectedRegistrationReport> {
  const cutoff = rejectedRegistrationCutoff(now);
  const [count] = await db.query(`SELECT count(*)::int AS n FROM users u WHERE ${ELIGIBLE}`, [cutoff]);
  const report: RejectedRegistrationReport = { eligible: count?.n ?? 0, purged: 0, documentsDeleted: 0, failed: 0 };
  if (!apply || !report.eligible) return report;
  const ids: Array<{ id: string }> = await db.query(`SELECT u.id FROM users u WHERE ${ELIGIBLE} ORDER BY u.id LIMIT ${BATCH}`, [cutoff]);
  for (const { id } of ids) {
    try {
      const result = await db.transaction(m => purgeOne(m, id, cutoff, storage));
      if (!result.purged) continue;
      report.purged += 1;
      if (result.documentDeleted) report.documentsDeleted += 1;
    } catch {
      // 저장소 파일 삭제 실패 · 계정 삭제 진행 중(쓰기 차단) 등은 되돌린 뒤 다음 실행에서 다시 본다.
      report.failed += 1;
    }
  }
  return report;
}
