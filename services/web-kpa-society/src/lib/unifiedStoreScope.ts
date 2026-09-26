/**
 * KPA 매장 경영자용 `/store` 의 새 위치 — store.neture.co.kr/work/kpa-society/store/*
 *   CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13 (매장 `/store` 위치 이전)
 *
 * 통합 Store Workspace handoff 의 returnPath 중 공통 매장 화면(`/store`, `/store/...`)만
 * KPA 서비스 지정 경로로 바꾼다. `/hub` · `/services` · `/` · `/work/kpa-society/...` 는 그대로다.
 * (legacy→unified 경로 표 RULES 는 store-ui-core(F3 동결)에 있어 건드리지 않고, 결과만 서비스로 한정한다.)
 */
export const KPA_SCOPED_STORE_BASE = '/work/kpa-society/store';

export function toKpaScopedStorePath(returnPath: string): string {
  if (returnPath === '/store' || returnPath.startsWith('/store/') || returnPath.startsWith('/store?')) {
    return `/work/kpa-society${returnPath}`;
  }
  return returnPath;
}
