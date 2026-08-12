/**
 * 분회 tenant 해석 (프론트엔드 단일 지점)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2
 *
 * tenant 는 딱 두 경로로만 결정된다 — backend `resolveBranch` 와 같은 규칙이다.
 *   1) 공용 도메인:  https://branch.kpa-society.co.kr/{slug}/...   → URL segment
 *   2) 자체 도메인:  https://{분회 도메인}/...                     → Host (GET /kpa-branch/resolve)
 *
 * 프론트의 해석은 UX 용이며 권한 근거가 아니다. 실제 경계는 backend guard 가 강제한다.
 * 분회별 별도 배포를 만들지 않으므로 하나의 번들이 두 진입 방식을 모두 처리한다.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveBranchByHost, type BranchSummary } from './api/branch';

/** 공용(멀티테넌트) 호스트 — 이 목록이 아니면 자체 도메인으로 본다. */
const PLATFORM_HOSTS = [
  'branch.kpa-society.co.kr',
  'localhost',
  '127.0.0.1',
];

export function isPlatformHost(host: string = window.location.hostname): boolean {
  return PLATFORM_HOSTS.includes(host) || host.endsWith('.run.app');
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
