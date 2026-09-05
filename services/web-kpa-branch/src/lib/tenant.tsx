/**
 * 분회 tenant 해석 (프론트엔드 단일 지점)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2
 *
 * tenant 는 딱 두 경로로만 결정된다 — backend `resolveBranch` 와 같은 규칙이다.
 *   1) 공용 경로:    https://kpa-society.co.kr/kpa/{slug}/...      → URL segment
 *   2) 자체 도메인:  https://{분회 도메인}/...                     → Host (GET /kpa-branch/resolve)
 *
 * WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
 *   공용 진입은 별도 서브도메인이 아니라 kpa-society.co.kr 의 `/kpa` path 다.
 *   `/kpa` 는 **URL prefix 일 뿐 tenant 가 아니다** — 분회 식별은 그 다음 세그먼트(slug)
 *   또는 Host 이며, organizationId 는 언제나 backend 가 확정한다.
 *
 * 프론트의 해석은 UX 용이며 권한 근거가 아니다. 실제 경계는 backend guard 가 강제한다.
 * 분회별 별도 배포를 만들지 않으므로 하나의 번들이 두 진입 방식을 모두 처리한다.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveBranchByHost, type BranchSummary } from './api/branch';

/** 공용(멀티테넌트) 호스트 — 이 목록이 아니면 자체 도메인으로 본다. */
const PLATFORM_HOSTS = [
  'kpa-society.co.kr',
  'www.kpa-society.co.kr',
  'localhost',
  '127.0.0.1',
];

export function isPlatformHost(host: string = window.location.hostname): boolean {
  return PLATFORM_HOSTS.includes(host) || host.endsWith('.run.app');
}

/**
 * 공용 진입 경로 prefix. LB(`o4o-global-lb` / path-matcher-kpa-society)의
 * `/kpa`·`/kpa/*` pathRule 및 vite `base` 와 **같은 값**이어야 한다.
 */
export const PUBLIC_BASE_PATH = '/kpa';

/**
 * react-router `basename`.
 *
 *   kpa-society.co.kr/kpa/{slug}      → '/kpa'
 *   {분회 자체 도메인}/{...}           → ''      (root 진입)
 *   Cloud Run URL root(운영 smoke)     → ''
 *
 * host 조건을 함께 보는 이유: 자체 도메인의 `/kpa` 경로를 공용 prefix 로 오인하지
 * 않기 위해서다 (자체 도메인에서 `/kpa` 는 분회의 일반 경로일 수 있다).
 */
export function detectBasename(
  host: string = window.location.hostname,
  pathname: string = window.location.pathname,
): string {
  if (!isPlatformHost(host)) return '';
  return pathname === PUBLIC_BASE_PATH || pathname.startsWith(`${PUBLIC_BASE_PATH}/`)
    ? PUBLIC_BASE_PATH
    : '';
}

interface TenantValue {
  /** 자체 도메인 진입 여부 */
  isCustomDomain: boolean;
  /** 자체 도메인일 때 해석된 분회 (공용 도메인이면 null — URL 이 tenant 를 정한다) */
  hostBranch: BranchSummary | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantValue>({
  isCustomDomain: false,
  hostBranch: null,
  isLoading: false,
  error: null,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const isCustomDomain = useMemo(() => !isPlatformHost(), []);
  const [hostBranch, setHostBranch] = useState<BranchSummary | null>(null);
  const [isLoading, setIsLoading] = useState(isCustomDomain);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCustomDomain) return;
    let alive = true;
    setIsLoading(true);
    resolveBranchByHost()
      .then((b) => {
        if (alive) setHostBranch(b);
      })
      .catch(() => {
        // 실패를 빈 상태로 삼키지 않는다 — 화면이 오류를 표시한다.
        if (alive) setError('이 도메인에 연결된 분회를 찾을 수 없습니다.');
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isCustomDomain]);

  return (
    <TenantContext.Provider value={{ isCustomDomain, hostBranch, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantValue {
  return useContext(TenantContext);
}
