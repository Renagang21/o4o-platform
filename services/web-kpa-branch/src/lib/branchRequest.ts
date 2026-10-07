/**
 * 분회 개설 신청 — 화면 판정용 순수 함수
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 최종 판정은 backend 다 (`branch-slug-policy.ts` · `branch-lifecycle.service.ts`).
 * 여기 목록은 신청자에게 **신청 전에** 알려 주기 위한 거울이다. 두 목록이 어긋나면
 * `branchRequest.test.ts` 와 backend 의 App.tsx drift 테스트가 잡는다.
 */

/**
 * 분회 주소로 쓸 수 없는 첫 path segment.
 *   kpa     — 플랫폼 호스트의 basename
 *   assets  — 정적 파일
 *   나머지  — App.tsx 의 고정 route (분회 홈 `/:branchSlug/*` 보다 먼저 매칭된다)
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

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN = 2;
const SLUG_MAX = 80;

export function normalizeSlugInput(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 신청 전 안내 — 문제가 없으면 null. */
export function slugProblem(raw: string): string | null {
  const slug = normalizeSlugInput(raw);
  if (!slug) return '주소를 입력하세요.';
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
    return `주소는 영문 소문자·숫자와 하이픈으로 ${SLUG_MIN}~${SLUG_MAX}자여야 합니다.`;
  }
  if (RESERVED_BRANCH_SLUGS.includes(slug)) {
    return `'${slug}' 는 서비스 화면 주소로 예약되어 분회 주소로 쓸 수 없습니다. 다른 주소로 신청해 주세요.`;
  }
  return null;
}

export type BranchRequestStatus = 'pending' | 'approved' | 'rejected' | 'slug_conflict';

export const BRANCH_REQUEST_STATUS_LABEL: Record<BranchRequestStatus, string> = {
  pending: '심사 대기',
  approved: '개설됨',
  rejected: '거절됨',
  slug_conflict: '주소 재신청 필요',
};

export type ApproveResult =
  | { outcome: 'created'; branch: { id: string; name: string; slug: string | null } }
  | { outcome: 'slug_conflict'; slug: string; reason: 'taken' | 'reserved' };

/**
 * 승인 결과 안내. 주소 충돌은 실패가 아니라 결과다 — 관리자는 주소를 바꾸거나 분회를 만들지 않고,
 * 신청은 `slug_conflict` 로 신청자에게 돌아간다.
 */
export function approveResultMessage(result: ApproveResult): string {
  if (result.outcome === 'created') {
    return `'${result.branch.name}' 분회를 개설했습니다. 신청자가 첫 분회 운영자로 지정되었습니다.`;
  }
  const why = result.reason === 'reserved' ? '서비스 화면 예약어' : '이미 사용 중인 주소';
  return `주소 '${result.slug}' 는 ${why}라 개설하지 않았습니다. 신청자에게 다른 주소로 재신청을 요청했습니다.`;
}
