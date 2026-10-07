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
 * 판정은 `service-catalog` 의 `domain` · `legacyDomains` 한 곳에서만 나온다 — 호스트 목록을 파일마다
 * 따로 적으면 카탈로그와 어긋난다. 서비스가 아닌 **surface** 두 개만 예외로 둔다:
 *
 *   `store.neture.co.kr`   공통 Store Workspace (handoff 의 WORKSPACE 계약과 같은 값)
 *   `admin.neture.co.kr`   플랫폼 관리자 화면
 *
 * 관리자 화면을 `neture` 서비스로 **임의 취급하지 않는다.** 관리자 세션은 서비스 가입 축이
 * 아니고, `neture` 로 접으면 ① 관리자 로그아웃이 일반 Neture 세션까지 끊거나 ② 반대로
 * Neture 로그아웃이 관리자 세션을 끊는다. 둘 다 의도한 범위가 아니다.
 * 그렇다고 `null` 로 두면 **관리자 로그아웃이 서버측 폐기를 건너뛴다**(3차 리뷰 지적) —
 * 그래서 고유한 범위 키를 준다.
 */
import { O4O_SERVICES } from '../config/service-catalog.js';
import { STORE_WORKSPACE_KEY, STORE_WORKSPACE_HOST } from '../config/store-workspace.js';

/**
 * 플랫폼 관리자 화면의 세션 범위 키. **서비스 키가 아니다** — `service-catalog` 에 없고
 * `service_memberships` 축도 아니다. `service_session_revocations.service_key` 에만 쓰인다.
 */
export const ADMIN_SURFACE_KEY = 'admin';

/** 관리자 화면 호스트 — 운영과 개발 미러 둘 다 같은 범위다. */
const ADMIN_HOSTS = ['admin.neture.co.kr', 'dev-admin.neture.co.kr'];

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
  if (ADMIN_HOSTS.includes(host)) return ADMIN_SURFACE_KEY;
  // canonical `domain` 과 수용 전용 `legacyDomains` 를 같은 서비스로 본다 — 옛 호스트(인쇄 QR · 북마크)로
  // 들어온 로그인도 같은 서비스 세션이다. 판정은 host 만 본다(path 무시): kpa-society.co.kr 은 kpa-society 의
  // 옛 호스트이고 그 아래 `/kpa/*` 는 옛 분회 공용 경로지만 여기서는 kpa-society 다. 분회 세션은 canonical
  // kpa.neture.co.kr 에서만 kpa-branch 로 귀속되며, 분회 앱이 옛 경로 방문을 그 호스트로 옮긴다
  // (WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1).
  return (
    O4O_SERVICES.find(
      (svc) =>
        svc.domain.toLowerCase() === host ||
        (svc.legacyDomains ?? []).some((legacy) => legacy.toLowerCase() === host),
    )?.key ?? null
  );
}
