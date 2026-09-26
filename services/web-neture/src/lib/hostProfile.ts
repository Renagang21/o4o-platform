/**
 * 호스트 프로필 — 한 번들(neture-web)로 서브도메인별 진입을 나눈다.
 *   CHECK-O4O-URL-FIRST-CENSUS-V1 §16 · §21-8 (서브도메인 이전 우선)
 *
 *   supplier.neture.co.kr → 공급자 영역(`/supplier/*`)
 *   funding.neture.co.kr  → 유통참여형 펀딩(`/market-trial/*`)
 *   그 외(neture.co.kr · www · run.app · localhost) → 기존 전체 사이트
 *
 * 경로 형태는 바꾸지 않는다(`/supplier/*` · `/market-trial/*` 유지) — 내부 링크를 고치지 않고
 * 호스트 경계에서만 판정한다. 한 호스트가 소유하지 않은 경로는 대표 호스트의 같은 경로로 보낸다.
 * 대표 호스트에서 새 호스트로 보내는 전환(cutover)은 빌드 플래그로만 켠다 — 새 호스트가
 * 검증되기 전까지 기존 `neture.co.kr/supplier` · `/market-trial` 링크는 그대로 동작한다.
 */

export type HostProfile = 'main' | 'supplier' | 'funding';

export const MAIN_ORIGIN = 'https://neture.co.kr';

export const HOST_ORIGIN: Readonly<Record<Exclude<HostProfile, 'main'>, string>> = Object.freeze({
  supplier: 'https://supplier.neture.co.kr',
  funding: 'https://funding.neture.co.kr',
});

const HOST_BY_NAME: Readonly<Record<string, Exclude<HostProfile, 'main'>>> = Object.freeze({
  'supplier.neture.co.kr': 'supplier',
  'funding.neture.co.kr': 'funding',
});

/** 호스트가 소유하는 경로 prefix. */
const OWNED_PREFIXES: Readonly<Record<Exclude<HostProfile, 'main'>, readonly string[]>> = Object.freeze({
  // /workspace/* 는 공급자 운영 화면(SupplierOpsLayout)과 공급자 레거시 리다이렉트다.
  // /supplier/forum* 레거시 deep-link 는 /supplier 에 포함되어 그대로 보존된다(Supplier 기준 :53).
  supplier: ['/supplier', '/account/supplier', '/workspace'],
  funding: ['/market-trial'],
});

/** 호스트의 첫 화면(`/`). */
export const HOST_HOME: Readonly<Record<Exclude<HostProfile, 'main'>, string>> = Object.freeze({
  supplier: '/supplier',
  funding: '/market-trial',
});

/**
 * 어느 호스트에서나 그 호스트의 세션으로 동작해야 하는 경로 — 인증 · 약관 · 내 정보.
 *   (토큰은 origin 별 localStorage 라, 대표 호스트로 보내면 로그인이 이어지지 않는다.)
 */
const SHARED_PREFIXES: readonly string[] = [
  '/handoff',
  '/login',
  '/register',
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

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function isOwnedPath(profile: Exclude<HostProfile, 'main'>, path: string): boolean {
  return OWNED_PREFIXES[profile].some((p) => matchesPrefix(path, p));
}

export function isSharedPath(path: string): boolean {
  return SHARED_PREFIXES.some((p) => matchesPrefix(path, p));
}

/** 경로의 소유 호스트(대표 호스트면 'main'). */
export function ownerOfPath(path: string): HostProfile {
  for (const profile of Object.keys(OWNED_PREFIXES) as Exclude<HostProfile, 'main'>[]) {
    if (isOwnedPath(profile, path)) return profile;
  }
  return 'main';
}

export type HostDecision =
  | { kind: 'stay' }
  | { kind: 'home'; to: string }
  | { kind: 'external'; href: string };

/**
 * 현재 호스트 · 경로에서 할 일.
 *   - 새 호스트의 `/` → 그 호스트 첫 화면
 *   - 새 호스트에서 소유하지 않은 경로(공유 경로 제외) → 대표 호스트 같은 경로(쿼리 · 해시 보존)
 *   - 대표 호스트에서 새 호스트 소유 경로 → cutover 가 켜진 호스트만 새 호스트로
 */
export function decideHost(
  profile: HostProfile,
  location: { pathname: string; search: string; hash: string },
  cutover: Readonly<Partial<Record<Exclude<HostProfile, 'main'>, boolean>>> = {},
): HostDecision {
  const { pathname, search, hash } = location;
  const suffix = `${pathname}${search}${hash}`;

  if (profile === 'main') {
    const owner = ownerOfPath(pathname);
    if (owner !== 'main' && cutover[owner]) {
      return { kind: 'external', href: `${HOST_ORIGIN[owner]}${suffix}` };
    }
    return { kind: 'stay' };
  }

  if (pathname === '/' || pathname === '') return { kind: 'home', to: `${HOST_HOME[profile]}${search}${hash}` };
  if (isOwnedPath(profile, pathname) || isSharedPath(pathname)) return { kind: 'stay' };
  return { kind: 'external', href: `${MAIN_ORIGIN}${suffix}` };
}

/** 빌드 플래그 — 대표 호스트에서 새 호스트로의 전환. 기본 꺼짐. */
export function readCutoverFlags(env: Record<string, unknown>): Partial<Record<Exclude<HostProfile, 'main'>, boolean>> {
  return {
    supplier: String(env.VITE_HOST_CUTOVER_SUPPLIER ?? '') === 'true',
    funding: String(env.VITE_HOST_CUTOVER_FUNDING ?? '') === 'true',
  };
}
