/**
 * 옛 분회 공용 경로 → canonical 호스트 이동
 * WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1
 *
 * 분회 서비스(`kpa-branch`)의 canonical 공용 호스트는 `kpa.neture.co.kr` 이다(backend service-catalog `domain`).
 * 옛 경로 `kpa-society.co.kr/kpa/*` 는 인쇄 QR · 북마크 때문에 계속 서빙되지만, 그 호스트의 루트는
 * 약국 사업자 서비스(`kpa-society`) 앱이고 backend 의 세션 귀속은 **host 만** 본다(`session-origin`).
 * 그 경로에서 로그인하면 세션이 kpa-society 로 귀속되어 분회 단위 로그아웃 · 로그인 자격 판정이 어긋난다.
 * 그래서 앱을 그리기 전에 같은 path · query · hash 의 canonical 호스트로 옮긴다.
 *
 * - `/kpa` prefix 는 떼어 낸다 — canonical 호스트에서는 root 진입이다(`detectBasename` → '').
 * - 분회 자체 도메인 · canonical 호스트 · 로컬 · Cloud Run URL 은 대상이 아니다(null).
 * - 진행 중 handoff(`/kpa/handoff?token=…`)도 같은 path 로 옮겨 그대로 교환된다 — service 대상 exchange 는
 *   수신 origin 을 보지 않는다.
 */
export const CANONICAL_BRANCH_HOST = 'kpa.neture.co.kr';
const CANONICAL_ORIGIN = `https://${CANONICAL_BRANCH_HOST}`;

const LEGACY_BRANCH_HOSTS = new Set(['kpa-society.co.kr', 'www.kpa-society.co.kr']);
const LEGACY_BASE_PATH = '/kpa';

export function legacyBranchRedirectUrl(
  host: string,
  pathname: string,
  search = '',
  hash = '',
): string | null {
  if (!LEGACY_BRANCH_HOSTS.has(host.toLowerCase())) return null;
  if (pathname !== LEGACY_BASE_PATH && !pathname.startsWith(`${LEGACY_BASE_PATH}/`)) return null;
  // 목적지는 언제나 canonical origin 이다 — path · query · hash 만 옮기고, 조립 결과의 origin 을 다시 확인한다
  // (`/kpa//evil.example` 같은 입력도 host 를 바꾸지 못한다).
  const target = new URL(CANONICAL_ORIGIN);
  target.pathname = pathname.slice(LEGACY_BASE_PATH.length) || '/';
  target.search = search;
  target.hash = hash;
  return target.origin === CANONICAL_ORIGIN ? target.href : null;
}
