/**
 * K-Cosmetics 매장 경영자용 `/store` 의 새 위치 — store.neture.co.kr/work/k-cosmetics/store/*
 *   CHECK-O4O-URL-FIRST-CENSUS-V1 §21-15 (K-Cosmetics 매장 화면 이전)
 *
 * store.neture.co.kr 에는 이 앱의 `/store` 화면 트리가 경로 · 옛 alias 그대로 이식돼 있다. 그래서 통합 매장 handoff 는
 * 공통 경로 표(store-ui-core RULES — 이식 전 KPA 공통 트리 기준)를 거치지 않고 **같은 경로를 서비스 지정 위치로** 보낸다.
 *   `/store`, `/store/...`  → `/work/k-cosmetics/store`, `/work/k-cosmetics/store/...`
 *   워크스페이스 홈 · 내 서비스(`/store/workspace` · `/store/services`) · `/store-hub/*` → 기존 RULES 결과(`mapped`) 그대로
 * 상품 · 주문 · 매출 · 관심 요청은 이식된 트리가 `/work/k-cosmetics/...` 서비스 업무 화면으로 다시 보낸다.
 */
export const KCOS_SCOPED_STORE_BASE = '/work/k-cosmetics/store';

const WORKSPACE_ONLY = ['/store/workspace', '/store/services'];

export function toKcosScopedStorePath(mapped: string, pathname: string, search: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (WORKSPACE_ONLY.includes(path)) return mapped;
  if (path === '/store' || path.startsWith('/store/')) return `/work/k-cosmetics${path}${search}`;
  return mapped;
}
