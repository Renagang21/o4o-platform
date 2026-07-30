/**
 * useAppStatus Hook
 *
 * Provides centralized access to app activation status across the admin dashboard.
 *
 * WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1:
 *   기존에는 플랫폼 관리자 전용 `GET /api/v1/admin/apps` (requireAdmin) 를 역할과 무관하게
 *   호출했다. 서비스 운영자 계정(platform 역할 없음)은 403 을 받았고, 그 실패가 `apps=[]` 로
 *   해석되어 **정상 활성 앱까지 비활성으로 판정**되었다(메뉴 숨김 / app-disabled 리다이렉트).
 *
 *   → 게이팅에는 인증 사용자용 read-only 계약 `GET /api/v1/apps/availability` 를 사용한다.
 *     플랫폼 관리자의 앱 관리 화면(AppStorePage 등)은 기존 `/admin/apps` 를 계속 사용한다.
 *
 *   query key 도 분리한다: 'appAvailability' (게이팅) ↔ 관리 화면의 설치 앱 목록.
 *   서로 다른 의미의 응답을 같은 캐시에 담지 않는다.
 *
 * 상태 구분 원칙:
 *   - `isLoading` : 아직 모름 — 비활성으로 확정하지 않는다.
 *   - `isUnavailable` : 상태 확인 실패(네트워크/서버 오류) — **"앱 비활성"이 아니다.**
 *   - `isActive(appId) === false` 는 위 두 경우가 아닐 때에만 "실제 비활성" 을 뜻한다.
 *   실제 역할·권한 검사는 이 훅이 아니라 기존 인증·인가 계약이 담당한다.
 */

import { useQuery } from '@tanstack/react-query';
import { appAvailabilityApi, AppAvailabilityEntry } from '@/api/admin-apps';
import { useAuth } from '@o4o/auth-context';

export interface UseAppStatusReturn {
  /** Loading state */
  isLoading: boolean;
  /** Error state (raw) */
  error: unknown;
  /**
   * 상태를 확인하지 못했음 (오류). "앱 비활성" 과 구분해야 한다.
   * 이 값이 true 이면 isActive() 결과를 비활성 근거로 사용하지 않는다.
   */
  isUnavailable: boolean;
  /** 레지스트리에 등록되어 있는가(=설치됨). isLoading/isUnavailable 이 아닐 때만 유효 */
  isInstalled: (appId: string) => boolean;
  /** Check if an app is active (isLoading/isUnavailable 이 아닐 때만 유효) */
  isActive: (appId: string) => boolean;
  /** Raw availability data */
  apps: AppAvailabilityEntry[];
}

/**
 * Hook to check app activation status
 */
export function useAppStatus(): UseAppStatusReturn {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['appAvailability'],
    queryFn: appAvailabilityApi.getAvailability,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });

  const apps = data ?? [];

  const installedSet = new Set<string>();
  const activeSet = new Set<string>();
  for (const app of apps) {
    installedSet.add(app.appId);
    if (app.active) activeSet.add(app.appId);
  }

  const isInstalled = (appId: string): boolean => installedSet.has(appId);
  const isActive = (appId: string): boolean => activeSet.has(appId);

  return {
    isLoading,
    error,
    isUnavailable: !!error,
    isInstalled,
    isActive,
    apps,
  };
}
