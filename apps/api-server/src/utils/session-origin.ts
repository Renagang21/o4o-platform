/**
 * 요청 origin → **세션이 속한 서비스 키**
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 서비스 단위 로그아웃·세션 폐기의 판정 축이다. 세 곳이 같은 답을 써야 한다:
 *   로그인   어느 서비스의 세션으로 발급하는가
 *   로그아웃 어느 서비스의 세션을 끝내는가
 *   handoff  어느 서비스로 넘기는가 (그쪽은 대상이 명시되므로 이 함수가 필요 없다)
 *
 * 판정은 `service-catalog` 의 `domain` 한 곳에서만 나온다 — 호스트 목록을 파일마다
 * 따로 적으면 카탈로그와 어긋난다. `store.neture.co.kr` 는 서비스가 아니라 공통
 * Workspace 이므로 예외로 그 키를 돌려준다(handoff 의 WORKSPACE 계약과 같은 값).
 */
import { O4O_SERVICES } from '../config/service-catalog.js';
import { STORE_WORKSPACE_KEY, STORE_WORKSPACE_HOST } from '../config/store-workspace.js';

/**
 * @returns 서비스 키 · Workspace 키 · 판정 불가면 `null`
 *
 * `null` 을 'unknown' 같은 문자열로 바꾸지 않는다 — 호출부가 "범위를 정할 수 없다" 를
 * 값으로 오인하면 폐기 범위가 잘못 넓어진다.
 */
export function resolveSessionServiceKey(origin: string | undefined | null): string | null {
  if (!origin) return null;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === STORE_WORKSPACE_HOST.toLowerCase()) return STORE_WORKSPACE_KEY;
  return O4O_SERVICES.find((svc) => svc.domain.toLowerCase() === host)?.key ?? null;
}
