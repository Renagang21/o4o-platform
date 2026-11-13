/**
 * My Home 의 「매장 있음」 기억 — 모아보기가 홈 진입 데이터로 확인한 값을 이 탭(sessionStorage)에 계정별로 둔다.
 * 왼쪽 메뉴의 「경영 현황」을 매장이 없는 계정에서 숨기는 데만 쓴다(2026-11-13 My Home 개선 3).
 * 모르면 undefined — 메뉴를 숨기지 않는다. 권한 판정이 아니다(경영 현황 화면과 서버가 다시 확인한다).
 */
const key = (accountId: string) => `o4o_my_home_has_store:${accountId}`;

export function rememberHasStore(accountId: string | undefined, hasStore: boolean): void {
  if (!accountId) return;
  try { sessionStorage.setItem(key(accountId), hasStore ? '1' : '0'); } catch { /* 저장 불가 — 메뉴는 기본값 */ }
}

export function knownHasStore(accountId: string | undefined): boolean | undefined {
  if (!accountId) return undefined;
  try {
    const value = sessionStorage.getItem(key(accountId));
    return value === '1' ? true : value === '0' ? false : undefined;
  } catch { return undefined; }
}
