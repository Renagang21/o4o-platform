/**
 * 호스트 프로필 — 한 번들(neture-web)로 서브도메인별 진입을 나눈다.
 *   CHECK-O4O-URL-FIRST-CENSUS-V1 §16 · §21-8 · §21-9 · §21-10 (서브도메인 이전)
 *
 *   supplier.neture.co.kr  → 공급자 영역(`/` = 공급자 대표 화면, `/supplier/*`)
 *   funding.neture.co.kr   → 유통참여형 펀딩(`/` = 펀딩 대표 화면, `/market-trial/*`)
 *   community.neture.co.kr → 독립·사업 회원 커뮤니티와 운영
 *   그 외(neture.co.kr · www · run.app · localhost) → 기존 전체 사이트
 *
 * 경로 형태는 바꾸지 않는다(`/supplier/*` · `/market-trial/*` 유지) — 내부 링크를 고치지 않고
 * 호스트 경계에서만 판정한다. 한 호스트가 소유하지 않은 경로는 대표 호스트의 같은 경로로 보낸다.
 * 대표 호스트의 기존 링크는 새 소유 호스트로 전달한다. 공급자·펀딩 공개 진입은
 * 빌드 플래그를 false 로 지정하여 전환 전 상태로 되돌릴 수 있다.
 */

export type SubHost = 'supplier' | 'funding' | 'community';
export type HostProfile = 'main' | SubHost;

export const MAIN_ORIGIN = 'https://neture.co.kr';

export const HOST_ORIGIN: Readonly<Record<SubHost, string>> = Object.freeze({
  supplier: 'https://supplier.neture.co.kr',
  funding: 'https://funding.neture.co.kr',
  community: 'https://community.neture.co.kr',
});

const HOST_BY_NAME: Readonly<Record<string, SubHost>> = Object.freeze({
  'supplier.neture.co.kr': 'supplier',
  'funding.neture.co.kr': 'funding',
  'community.neture.co.kr': 'community',
});

/** 호스트가 소유하는 경로 prefix. `/` 는 각 호스트의 대표 화면으로 App 이 직접 렌더한다. */
const OWNED_PREFIXES: Readonly<Record<SubHost, readonly string[]>> = Object.freeze({
  // /workspace/* 는 공급자 운영 화면(SupplierOpsLayout)과 공급자 레거시 리다이렉트다.
  // 기존 공급자 포럼 주소는 아래 community adapter 가 먼저 처리한다.
  supplier: ['/operator/service-members/supplier', '/supplier', '/account/supplier', '/workspace', '/operator/suppliers', '/operator/supplier-quality', '/admin/supplier-governance', '/admin/admin-suppliers', '/admin/supplier-quality'],
  funding: ['/operator/service-members/funding', '/market-trial', '/operator/market-trial', '/admin/market-trial'],
  community: ['/operator/service-members/community', '/communities', '/pharmacist', '/mypage/communities', '/admin/communities', '/operator/communities', '/admin/forum-delete-requests', '/admin/forum-deleted', '/admin/forum-analytics', '/operator/forum-delete', '/operator/forum-delete-requests', '/operator/forum-analytics'],
});

/**
 * 어느 호스트에서나 그 호스트의 세션으로 동작해야 하는 경로 — 인증 · 약관 · 내 정보.
 *   (토큰은 origin 별 localStorage 라, 대표 호스트로 보내면 로그인이 이어지지 않는다.)
 */
const SHARED_PREFIXES: readonly string[] = [
  '/handoff',
  '/login',
  '/register',
  // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 이메일 가입 · 확인 · 아이디 찾기
  '/signup',
  '/verify-email',
  '/find-id',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/contact',
  '/mypage',
];

export function getHostProfile(hostname: string): HostProfile {
  return HOST_BY_NAME[hostname.toLowerCase()] ?? 'main';
}

/** 현재 창의 호스트 프로필(모듈 로드 시 1회 판정). */
export const CURRENT_HOST_PROFILE: HostProfile =
  typeof window !== 'undefined' ? getHostProfile(window.location.hostname) : 'main';

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function isOwnedPath(profile: SubHost, path: string): boolean {
  return OWNED_PREFIXES[profile].some((p) => matchesPrefix(path, p));
}

export function isSharedPath(path: string): boolean {
  return SHARED_PREFIXES.some((p) => matchesPrefix(path, p));
}

/** 경로의 소유 호스트(대표 호스트면 'main'). */
export function ownerOfPath(path: string): HostProfile {
  for (const profile of Object.keys(OWNED_PREFIXES) as SubHost[]) {
    if (isOwnedPath(profile, path)) return profile;
  }
  return 'main';
}

/** Management paths have one owner even before public entry cutover. */
function isServiceManagementPath(path: string): boolean {
  return path.startsWith('/operator/') || path.startsWith('/admin/') || path === '/mypage/communities';
}

export type HostDecision = { kind: 'stay' } | { kind: 'external'; href: string };

/**
 * 현재 호스트 · 경로에서 할 일.
 *   - 새 호스트의 `/` → 그대로(App 이 호스트 대표 화면을 렌더)
 *   - 커뮤니티 호스트는 독립 커뮤니티와 사업 회원 커뮤니티를 직접 제공
 *   - 새 호스트에서 소유하지 않은 경로(공유 경로 제외) → 대표 호스트 같은 경로(쿼리 · 해시 보존)
 *   - 대표 호스트에서 새 호스트 소유 경로 → cutover 가 켜진 호스트만 새 호스트로
 */
export function decideHost(
  profile: HostProfile,
  location: { pathname: string; search: string; hash: string },
  cutover: Readonly<Partial<Record<SubHost, boolean>>> = {},
): HostDecision {
  const { pathname, search, hash } = location;
  const suffix = `${pathname}${search}${hash}`;

  // Funding work has one host; old supplier URLs are narrow aliases.
  if (matchesPrefix(pathname, '/supplier/market-trial')) {
    const tail = pathname.slice('/supplier/market-trial'.length);
    return { kind: 'external', href: `${HOST_ORIGIN.funding}/market-trial/manage${tail}${search}${hash}` };
  }

  // Preserve old forum addresses while the community owns the actual workspace.
  const generalBase = '/communities/o4o-general/forum';
  let forumPath: string | null = null;
  if (matchesPrefix(pathname, '/forum')) forumPath = generalBase + pathname.slice('/forum'.length);
  else if (pathname === '/community') forumPath = generalBase;
  else if (matchesPrefix(pathname, '/workspace/forum')) forumPath = generalBase + pathname.slice('/workspace/forum'.length);
  else if (matchesPrefix(pathname, '/supplier/forum')) {
    const tail = pathname.slice('/supplier/forum'.length);
    forumPath = tail === '' ? `${generalBase}/posts` : tail === '/request-category' ? `${generalBase}/request` : generalBase + tail;
  } else if (pathname === '/supplier/my-forum') forumPath = `${generalBase}/owned`;
  if (forumPath) {
    const query = new URLSearchParams(search);
    if (matchesPrefix(forumPath, `${generalBase}/service-update`)) {
      const tail = forumPath.slice(`${generalBase}/service-update`.length);
      if (!tail) { forumPath = `${generalBase}/posts`; query.set('board', 'service-update'); }
      else if (tail === '/new') { forumPath = `${generalBase}/write`; query.set('forum', 'service-update'); }
      else forumPath = `${generalBase}/post${tail}`;
    }
    return { kind: 'external', href: `https://community.neture.co.kr${forumPath}${query.size ? `?${query}` : ''}${hash}` };
  }

  const managementOrigins: Record<string, string> = {
    '/operator/pharmacy-memberships': 'https://store.neture.co.kr',
    '/operator/semi-franchises': 'https://pharmacy.neture.co.kr',
    '/admin/semi-franchises': 'https://admin.neture.co.kr',
    '/admin/platform': 'https://admin.neture.co.kr',
    '/admin/settings/service-audience': 'https://admin.neture.co.kr',
  };
  for (const [prefix, origin] of Object.entries(managementOrigins)) {
    if (matchesPrefix(pathname, prefix)) return { kind: 'external', href: `${origin}${suffix}` };
  }

  if (profile === 'main') {
    const owner = ownerOfPath(pathname);
    if (owner !== 'main' && (cutover[owner] || isServiceManagementPath(pathname) || owner === 'community')) {
      return { kind: 'external', href: `${HOST_ORIGIN[owner]}${suffix}` };
    }
    return { kind: 'stay' };
  }

  if (pathname === '/' || pathname === '') return { kind: 'stay' };
  if (isOwnedPath(profile, pathname) || isSharedPath(pathname)) return { kind: 'stay' };
  return { kind: 'external', href: `${MAIN_ORIGIN}${suffix}` };
}

/** 빌드 플래그 — 대표 호스트에서 새 호스트로의 전환. 기본 켜짐, 명시적 false 는 롤백. */
export function readCutoverFlags(env: Record<string, unknown>): Partial<Record<SubHost, boolean>> {
  return {
    supplier: String(env.VITE_HOST_CUTOVER_SUPPLIER ?? 'true') === 'true',
    funding: String(env.VITE_HOST_CUTOVER_FUNDING ?? 'true') === 'true',
  };
}
