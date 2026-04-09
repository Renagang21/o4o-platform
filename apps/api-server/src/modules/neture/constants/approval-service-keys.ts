/**
 * Neture Approval-Eligible Service Keys — SSOT
 *
 * WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1
 *
 * 배경:
 * - offer.service_keys에는 'neture', 'glucoseview'를 포함한 모든 대상 서비스가 저장될 수 있음
 * - 하지만 **승인 요청 대상**은 운영 정책상 glycopharm / kpa-society / k-cosmetics 만
 * - 이 정책을 여러 곳에서 필터링하면 누락/불일치 위험이 있으므로 한 곳에서만 정의
 *
 * 정책 변경 시 이 파일만 수정한다.
 */

/**
 * 승인 요청 가능(= offer_service_approvals 레코드 생성 대상) 서비스 키.
 * neture / glucoseview 등은 정책상 승인 대상이 아니다.
 */
export const APPROVAL_ELIGIBLE_SERVICE_KEYS = [
  'glycopharm',
  'kpa-society',
  'k-cosmetics',
] as const;

export type ApprovalEligibleServiceKey = (typeof APPROVAL_ELIGIBLE_SERVICE_KEYS)[number];

const ELIGIBLE_SET: Set<string> = new Set(APPROVAL_ELIGIBLE_SERVICE_KEYS);

/**
 * 주어진 serviceKeys 배열에서 승인 대상에 해당하는 키만 남긴다.
 * 중복 제거 + 정책 필터.
 */
export function filterApprovalEligibleServiceKeys(keys: readonly string[] | null | undefined): string[] {
  if (!keys || keys.length === 0) return [];
  const out = new Set<string>();
  for (const k of keys) {
    if (ELIGIBLE_SET.has(k)) out.add(k);
  }
  return Array.from(out);
}

export function isApprovalEligibleServiceKey(key: string): boolean {
  return ELIGIBLE_SET.has(key);
}
