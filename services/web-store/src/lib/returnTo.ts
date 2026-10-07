/**
 * 원래 경로 보존(returnTo) — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14
 *
 * 매장이 2개 이상인 경영자가 `/work/kpa-society/store/marketing/qr` 로 들어오면 StoreGate 가 매장 선택으로
 * 보내고, 선택 뒤 홈(`/`)으로 떨어져 원래 경로를 잃었다. 비로그인 → 로그인도 같다.
 * 같은 앱 안의 경로만 허용한다(open redirect 방지) — 외부 URL · `//` · 선택/로그인/handoff 자체는 버린다.
 */
import { WORKSPACE_PATHS } from '../config/workspace';

export const RETURN_TO_PARAM = 'returnTo';

const SELF_PATHS = [WORKSPACE_PATHS.login, WORKSPACE_PATHS.select, WORKSPACE_PATHS.handoff];

export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  const path = raw.split(/[?#]/)[0];
  if (path === WORKSPACE_PATHS.home) return null;
  if (SELF_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return raw;
}

/** `/select-store?returnTo=...` · `/login?returnTo=...` — 보존할 경로가 없으면 대상 경로 그대로 */
export function withReturnTo(target: string, current: string): string {
  const safe = sanitizeReturnTo(current);
  return safe ? `${target}?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}` : target;
}

export function readReturnTo(search: string): string | null {
  return sanitizeReturnTo(new URLSearchParams(search).get(RETURN_TO_PARAM));
}
