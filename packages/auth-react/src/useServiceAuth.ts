/**
 * useServiceAuth — 서비스 프런트 인증 Core
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * KPA-Society 와 Neture 의 AuthContext 를 비교해 **양쪽이 공유하는 최소 공통 계약**만 담았다.
 * 서비스는 자기 Context 를 계속 소유하되, 아래 중복 로직을 이 훅에 위임한다.
 *
 *   - isLoading 초기값 = 토큰 유무 (토큰 없으면 spinner 없이 즉시 시작)
 *   - 세션 복구: 토큰 없으면 `/auth/me` 를 호출조차 하지 않는다(불필요한 401 방지)
 *   - AUTH_TOKEN_CLEARED_EVENT 수신 시 user 정리(토큰 갱신 실패 → stale auth 제거)
 *   - login / logout / logoutAll
 *
 * **서비스명 조건문을 두지 않는다.** 차이는 전부 `ServiceAuthConfig` 주입으로 표현한다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseAuthResponse, resolveAuthError, AUTH_TOKEN_CLEARED_EVENT } from '@o4o/auth-utils';
import type {
  AuthLoginResult,
  PendingPolicyAcceptance,
  PolicyAcceptanceResult,
  ServiceAuthConfig,
  ServiceAuthCore,
} from './types';

/**
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §16
 * API 사용자 payload(로그인 · /auth/me · 428 응답 본문)에서 `pendingPolicyAcceptances` 를 안전하게 읽는다.
 * 형태가 어긋나면 [] — 게이트를 잘못 띄우지 않는다(서버 게이트가 최종 방어선).
 */
export function readPendingPolicyAcceptances(source: unknown): PendingPolicyAcceptance[] {
  const raw = (source as { pendingPolicyAcceptances?: unknown } | null | undefined)?.pendingPolicyAcceptances;
  if (!Array.isArray(raw)) return [];
  const out: PendingPolicyAcceptance[] = [];
  for (const item of raw) {
    const p = item as Partial<PendingPolicyAcceptance> | null;
    if (!p || typeof p.serviceKey !== 'string' || typeof p.policyDocumentId !== 'string') continue;
    out.push({
      serviceKey: p.serviceKey,
      documentType: typeof p.documentType === 'string' ? p.documentType : 'terms',
      policyDocumentId: p.policyDocumentId,
      version: typeof p.version === 'number' ? p.version : Number(p.version ?? 0),
      title: typeof p.title === 'string' ? p.title : '',
    });
  }
  return out;
}

/** axios 계열 오류에서 응답 본문·상태코드를 안전하게 꺼낸다. */
function readErrorResponse(error: unknown): { data?: Record<string, unknown>; status?: number } {
  const e = error as { response?: { data?: unknown; status?: number } };
  const data = e?.response?.data;
  return {
    data: data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined,
    status: e?.response?.status,
  };
}

export function useServiceAuth<TUser>(config: ServiceAuthConfig<TUser>): ServiceAuthCore<TUser> {
  // meEndpoint 는 refresh() 안에서 cfgRef 로 읽는다(effect 재실행 방지) → 여기서 꺼내지 않는다.
  const {
    serviceKey,
    authClient,
    toUser,
    getAccessToken,
    onAuthenticated,
    logoutAllEndpoint = '/auth/logout-all',
    clearSessionOnLogoutAll = true,
  } = config;

  const [user, setUser] = useState<TUser | null>(null);
  const [pendingPolicyAcceptances, setPendingPolicyAcceptances] = useState<PendingPolicyAcceptance[]>([]);
  // 토큰이 없으면 복구할 세션도 없다 → 로딩 스피너 없이 즉시 비로그인 화면.
  const [isLoading, setIsLoading] = useState(() => !!getAccessToken());

  // config 는 매 렌더 새 객체일 수 있다. effect 를 재실행시키지 않도록 ref 로 고정한다.
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const refresh = useCallback(async () => {
    const cfg = cfgRef.current;
    if (!cfg.getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const response = await cfg.authClient.api.get(cfg.meEndpoint ?? '/auth/me');
      const { user: apiUser } = parseAuthResponse(response.data as never);
      if (apiUser) {
        const built = cfg.toUser(apiUser as unknown as Record<string, unknown>);
        setPendingPolicyAcceptances(readPendingPolicyAcceptances(apiUser));
        setUser(built);
        cfg.onAuthenticated?.(built);
      } else {
        setPendingPolicyAcceptances([]);
        setUser(null);
      }
    } catch {
      // 세션 없음/만료 — 비로그인 상태로 진행(정상 경로).
      setPendingPolicyAcceptances([]);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 토큰 갱신 실패 시 stale auth 정리 (auth-client 가 이벤트를 발행).
  useEffect(() => {
    const handleTokenCleared = () => setUser(null);
    window.addEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
    return () => window.removeEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
  }, []);

  /**
   * 로그인 — **항상 result object 를 반환하고 throw 하지 않는다.**
   * 서버 응답 `code`(예: `SERVICE_NOT_MEMBER`)를 그대로 전달해 서비스별 안내 UX 가 분기할 수 있게 한다.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<AuthLoginResult<TUser>> => {
      setIsLoading(true);
      try {
        const result = (await authClient.login({ email, password, serviceKey })) as {
          user?: unknown;
        };
        const apiUser = result?.user as Record<string, unknown> | undefined;
        if (!apiUser) {
          return { success: false, error: '로그인 응답이 올바르지 않습니다.' };
        }
        const built = toUser(apiUser);
        setPendingPolicyAcceptances(readPendingPolicyAcceptances(apiUser));
        setUser(built);
        onAuthenticated?.(built);
        return { success: true, user: built };
      } catch (error: unknown) {
        const { data, status } = readErrorResponse(error);
        if (data) {
          return {
            success: false,
            error: resolveAuthError(data as never, status ?? 0),
            code: typeof data.code === 'string' ? data.code : undefined,
            // WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1
            accountStatus:
              typeof data.accountStatus === 'string' ? data.accountStatus : undefined,
            status,
          };
        }
        // CORS/네트워크 오류 vs 서버 오류 구분
        const e = error as { code?: string };
        if (error instanceof TypeError || e?.code === 'ERR_NETWORK') {
          return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' };
        }
        return { success: false, error: '로그인에 실패했습니다.' };
      } finally {
        setIsLoading(false);
      }
    },
    [authClient, serviceKey, toUser, onAuthenticated],
  );

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } catch {
      // 서버 로그아웃 실패해도 로컬 상태는 반드시 정리한다.
    } finally {
      setPendingPolicyAcceptances([]);
      setUser(null);
    }
  }, [authClient]);

  /**
   * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17·§20
   * pending 약관을 하나씩 제출한다(서버가 문서·서비스·버전을 재검증). 전부 성공하면 세션을 재확인해
   * pending 을 서버 판정으로 다시 채운다. 실패해도 throw 하지 않는다.
   */
  const acceptPendingPolicies = useCallback(async (): Promise<PolicyAcceptanceResult> => {
    let remaining = pendingPolicyAcceptances;
    for (const item of pendingPolicyAcceptances) {
      try {
        const response = await authClient.api.post('/auth/policy-acceptances', {
          serviceKey: item.serviceKey,
          policyDocumentId: item.policyDocumentId,
          version: item.version,
        });
        const body = (response?.data ?? {}) as { data?: { pending?: unknown } };
        remaining = readPendingPolicyAcceptances({ pendingPolicyAcceptances: body.data?.pending });
      } catch (error: unknown) {
        const { data, status } = readErrorResponse(error);
        const code = typeof data?.code === 'string' ? data.code : undefined;
        const message = typeof data?.error === 'string'
          ? data.error
          : status === 409
            ? '약관이 갱신되었습니다. 화면을 새로고침한 뒤 다시 동의해 주세요.'
            : '약관 동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        return { success: false, error: message, code, pending: remaining };
      }
    }
    setPendingPolicyAcceptances(remaining);
    await refresh();
    return { success: true, pending: remaining };
  }, [authClient, pendingPolicyAcceptances, refresh]);

  const logoutAll = useCallback(async () => {
    try {
      await authClient.api.post(logoutAllEndpoint);
    } finally {
      // 서비스별 차이: 서버 호출만 하고 로컬 세션은 유지하는 서비스가 있다(설정으로 분리).
      if (clearSessionOnLogoutAll) setUser(null);
    }
  }, [authClient, logoutAllEndpoint, clearSessionOnLogoutAll]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    pendingPolicyAcceptances,
    acceptPendingPolicies,
    login,
    logout,
    logoutAll,
    refresh,
    setUser,
  };
}
