import type { EntityManager } from 'typeorm';

export class OperationError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export function operationReason(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 2000 || value.includes('\0'))
    throw new OperationError(400, 'REASON_REQUIRED', '처리 사유를 1~2,000자로 입력해 주세요.');
  return value.trim();
}
/** Call only within the mutation transaction. Free text is redacted from query error serialization. */
export async function recordOperation(manager: Pick<EntityManager, 'query'>, serviceKey: string, actorId: string | null,
  action: string, meta: Record<string, unknown>) {
  const value = { toPostgres: () => JSON.stringify(meta), toJSON: () => '[redacted]' };
  await manager.query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta)
    VALUES($1,$2,$3,'manual','success',$4::jsonb)`, [serviceKey, actorId, action, value]);
}
