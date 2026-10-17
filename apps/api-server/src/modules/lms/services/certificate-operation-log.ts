import type { EntityManager } from 'typeorm';

export type CertificateOperation = 'issue' | 'renew' | 'revoke' | 'update';
export class CertificateOperationError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export function certificateReason(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || value.includes('\0') || [...value.trim()].length > 2000)
    throw new CertificateOperationError(400, '폐기 사유는 2,000자 이내로 입력해 주세요.');
  return value.trim() || null;
}
export function certificateState(value: { isValid: boolean; expiresAt?: Date | null }) {
  return { isValid: value.isValid, expiresAt: value.expiresAt ? new Date(value.expiresAt).toISOString() : null };
}
export async function recordCertificateOperation(manager: EntityManager, actorId: string, certificateId: string,
  action: CertificateOperation, before: ReturnType<typeof certificateState> | null, after: ReturnType<typeof certificateState>, reason: string | null = null) {
  const details = { certificateId, action, before, after, reason };
  // Keep free text out of TypeORM's parameter error logging; pg still receives JSON.
  const parameter = { toPostgres: () => JSON.stringify(details), toJSON: () => '[redacted]' };
  await manager.query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta)
    VALUES('lecture',$1,'lecture.certificate_operation','manual','success',$2::jsonb)`, [actorId, parameter]);
}
