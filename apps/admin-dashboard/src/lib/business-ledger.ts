/**
 * Business Ledger — 약국 협력사업 원장(semi_franchises) 상태를 운영 권한 행에 붙인다.
 *
 * 운영자 목록의 "계정 상태"(users.status)와 사업 개설 상태는 별개다.
 * `neture:{key}_admin · _operator` 역할을 지정해도 사업 행은 생기지 않는다 —
 * 사업 상세 · 가입 대상 목록은 active `semi_franchises` 행이 있어야 노출된다.
 *
 * 조회 실패는 '미등록'으로 보이지 않게 따로 구분한다.
 * 협동조합(pharmcoop)은 별도 등록 절차라 이 원장 표시 대상이 아니다.
 */

export const LEDGER_BUSINESS_KEYS = ['pharmacy', 'carepharm', 'megapharm'] as const;
/** 운영자 화면에서 등록 양식 프리셋 링크를 주는 사업 */
export const REGISTER_PRESET_KEYS = ['carepharm', 'megapharm'] as const;

export type LedgerRowStatus = 'active' | 'closed';

export type BusinessLedgerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; byKey: Record<string, LedgerRowStatus> };

export type BusinessLedgerStatus =
  | 'not_applicable'
  | 'loading'
  | 'error'
  | 'unregistered'
  | 'active'
  | 'closed';

export function isLedgerBusinessKey(serviceKey: string): boolean {
  return (LEDGER_BUSINESS_KEYS as readonly string[]).includes(serviceKey);
}

export function resolveBusinessLedgerStatus(serviceKey: string, ledger: BusinessLedgerState): BusinessLedgerStatus {
  if (!isLedgerBusinessKey(serviceKey)) return 'not_applicable';
  if (ledger.status !== 'ok') return ledger.status;
  return ledger.byKey[serviceKey] ?? 'unregistered';
}

export function registerPresetPath(serviceKey: string): string {
  return (REGISTER_PRESET_KEYS as readonly string[]).includes(serviceKey)
    ? `/admin/pharmacy-service-settings?register=${serviceKey}`
    : '/admin/pharmacy-service-settings';
}

/**
 * `GET /neture/admin/pharmacy-service-settings` 응답을 key → status 로 줄인다.
 * 실패·행 형식 오류·중복 key는 실패로 던진다(빈 원장 = 미등록으로 위장하지 않는다).
 */
export function parseBusinessLedgerResponse(body: unknown): Record<string, LedgerRowStatus> {
  const b = body as { success?: boolean; data?: unknown; error?: string } | undefined;
  if (!b || b.success !== true || !Array.isArray(b.data)) {
    throw new Error(b?.error || '사업 원장 응답 형식이 올바르지 않습니다.');
  }
  const byKey: Record<string, LedgerRowStatus> = {};
  for (const row of b.data as Array<{ key?: unknown; status?: unknown } | null>) {
    if (!row || typeof row.key !== 'string' || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(row.key)
      || (row.status !== 'active' && row.status !== 'closed')
      || Object.prototype.hasOwnProperty.call(byKey, row.key)) {
      throw new Error('사업 원장 응답 형식이 올바르지 않습니다.');
    }
    Object.defineProperty(byKey, row.key, { value: row.status, enumerable: true });
  }
  return byKey;
}
