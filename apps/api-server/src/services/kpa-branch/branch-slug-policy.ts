/**
 * 분회 주소(slug) 예약어 정책 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (분회 주소 충돌 방어)
 *
 * 의존성 없는 모듈이다. 개설 신청·승인(branch-lifecycle.service)과 super_admin 직접 생성
 * (BranchAdminController.create)이 같은 목록을 쓴다.
 */
/**
 * 분회 주소로 쓸 수 없는 예약어.
 *
 * 분회 주소는 `kpa.neture.co.kr/{slug}` 의 **첫 경로 조각**이다(web-kpa-branch `/:branchSlug/*`).
 * 같은 자리에 고정 route · 정적 경로가 있으면 그 분회는 영원히 열리지 않는다:
 *   login · join · reset-password · handoff · me · service-admin   web-kpa-branch App.tsx 고정 route
 *   kpa                                                           플랫폼 호스트 basename(`/kpa/*`) — detectBasename 이 먼저 먹는다
 *   assets                                                        vite 정적 산출물 디렉터리(serve -s dist)
 * web-kpa-branch App.tsx 에 고정 route 를 추가하면 여기도 추가한다(drift 는 테스트가 잡는다).
 */
export const RESERVED_BRANCH_SLUGS: readonly string[] = Object.freeze([
  'kpa',
  'assets',
  'login',
  'join',
  'reset-password',
  'handoff',
  'me',
  'service-admin',
]);

export function isReservedBranchSlug(slug: string): boolean {
  return RESERVED_BRANCH_SLUGS.includes(slug.trim().toLowerCase());
}

/** 예약어 주소 안내 — 신청 시 · 승인 직전 재검사가 같은 문구를 쓴다. */
export const reservedSlugMessage = (slug: string): string =>
  `'${slug}' 는 서비스 화면 주소로 예약되어 분회 주소로 쓸 수 없습니다. 다른 주소로 신청해 주세요.`;
