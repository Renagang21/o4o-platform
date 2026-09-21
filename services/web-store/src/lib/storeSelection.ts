/**
 * Store Selector 선택값 전달 — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §3-③
 *
 * 결정: **sessionStorage** (DB 저장 0 · URL 미유지).
 *   - 새로고침에 살아남는다(같은 탭). 탭을 닫으면 사라져 다음 진입에서 다시 고른다.
 *   - 서버는 이 값을 믿지 않는다 — 매 요청 `store-services?organizationId=` 가 organization_members 소유권을 재검증하고
 *     `NOT_STORE_MEMBER` 면 클라이언트가 선택값을 버린다(`clearSelectedOrganizationId`).
 *   - 사용자는 nav 의 `내 매장: ○○ ▼` 로 언제든 바꾼다.
 * localStorage 를 쓰지 않는 이유: 계정 전환 뒤 이전 계정의 organizationId 가 남는 창을 줄인다(어차피 서버가 거부하지만
 * 불필요한 NOT_STORE_MEMBER 왕복을 피한다).
 */
const KEY = 'o4o.store.selectedOrganizationId';

function storage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function readSelectedOrganizationId(): string | null {
  const v = storage()?.getItem(KEY);
  return v && v.trim() ? v : null;
}
export function writeSelectedOrganizationId(organizationId: string): void {
  storage()?.setItem(KEY, organizationId);
}
export function clearSelectedOrganizationId(): void {
  storage()?.removeItem(KEY);
}
