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
 *   - loginWithGoogle / signupWithGoogle / logout
 *
 * **서비스명 조건문을 두지 않는다.** 차이는 전부 `ServiceAuthConfig` 주입으로 표현한다.
 */

import type { SocialProof, KakaoSignupRequest, KakaoAuthResponse } from '@o4o/auth-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseAuthResponse, resolveAuthError, AUTH_TOKEN_CLEARED_EVENT } from '@o4o/auth-utils';
import type {
  AuthLoginResult,
  GoogleSignupConsents,
  AuthServiceAccess,
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

/** 서버 `serviceAccess`(세미프랜차이즈 자격 거절)를 형태 검증 후 읽는다. 어긋나면 undefined. */
export function readServiceAccess(source: unknown): AuthServiceAccess | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const s = source as Record<string, unknown>;
  if (typeof s.semiFranchiseKey !== 'string') return undefined;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    semiFranchiseKey: s.semiFranchiseKey,
    pharmacyMembershipStatus: str(s.pharmacyMembershipStatus),
    semiFranchiseMembershipStatus: str(s.semiFranchiseMembershipStatus),
    next: str(s.next),
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
  } = config;

  const [user, setUser] = useState<TUser | null>(null);
  const [pendingPolicyAcceptances, setPendingPolicyAcceptances] = useState<PendingPolicyAcceptance[]>([]);
  // 토큰이 없으면 복구할 세션도 없다 → 로딩 스피너 없이 즉시 비로그인 화면.
  const [isLoading, setIsLoading] = useState(() => !!getAccessToken());

  // config 는 매 렌더 새 객체일 수 있다. effect 를 재실행시키지 않도록 ref 로 고정한다.
  const sessionGeneration = useRef(0);
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const refresh = useCallback(async () => {
    const generation = sessionGeneration.current;
    const cfg = cfgRef.current;
    if (!cfg.getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const response = await cfg.authClient.api.get(cfg.meEndpoint ?? '/auth/me');
      if (generation !== sessionGeneration.current || !cfg.getAccessToken()) return;
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
      if (generation !== sessionGeneration.current) return;
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
    const handleTokenCleared = () => {
      sessionGeneration.current += 1;
      setPendingPolicyAcceptances([]); setUser(null);
    };
    window.addEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
    return () => window.removeEventListener(AUTH_TOKEN_CLEARED_EVENT, handleTokenCleared);
  }, []);

  /**
   * 세션 채택 공통 — /auth/google/login · /auth/google/signup.
   * **항상 result object 를 반환하고 throw 하지 않는다.**
   * 서버 응답 `code`(예: `SERVICE_NOT_MEMBER` · `GOOGLE_SIGNUP_REQUIRED`)를 그대로 전달해
   * 서비스별 안내 UX 가 분기할 수 있게 한다.
   */
  const adoptSession = useCallback(
    async (
      request: () => Promise<unknown>,
      failMessage: string,
      // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 이메일 로그인 오류 문구는 서버가 확정한다(EmailAuthError).
      //   공통 코드표(AUTH_ERROR_MESSAGES)에 이메일 코드를 넣지 않고 서버 `error` 를 그대로 쓴다.
      preferServerMessage = false,
    ): Promise<AuthLoginResult<TUser>> => {
      const generation = ++sessionGeneration.current;
      setIsLoading(true);
      try {
        const result = (await request()) as KakaoAuthResponse;
        if (generation !== sessionGeneration.current) return { success: false, error: '로그인이 취소되었습니다. 다시 시도해 주세요.' };
        if (result.nextStep === 'signup' || result.nextStep === 'verify-email') return { success: false, nextStep: result.nextStep, signupTicket: result.signupTicket, email: result.email, maskedEmail: result.maskedEmail, mailSent: result.mailSent };
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
          // WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 세미프랜차이즈 자격 거절은 서버 문구가 상태별 안내다.
          const serviceAccess = readServiceAccess(data.serviceAccess);
          return {
            success: false,
            error:
              (preferServerMessage || serviceAccess) && typeof data.error === 'string' && data.error && status !== 429
                ? data.error
                : resolveAuthError(data as never, status ?? 0),
            code: typeof data.code === 'string' ? data.code : undefined,
            // WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1
            accountStatus:
              typeof data.accountStatus === 'string' ? data.accountStatus : undefined,
            ...(serviceAccess ? { serviceAccess } : {}),
            status,
          };
        }
        // CORS/네트워크 오류 vs 서버 오류 구분
        const e = error as { code?: string };
        if (error instanceof TypeError || e?.code === 'ERR_NETWORK') {
          return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' };
        }
        return { success: false, error: failMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [toUser, onAuthenticated],
  );

  /**
   * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D): Google ID token 으로 로그인.
   * 미등록 Google 계정이면 `code === 'GOOGLE_SIGNUP_REQUIRED'` — 호출부는 동의 화면 → `signupWithGoogle` 로 잇는다.
   */
  const loginWithGoogle = useCallback(
    (idToken: string): Promise<AuthLoginResult<TUser>> =>
      adoptSession(() => authClient.loginWithGoogle(idToken, { serviceKey }), 'Google 로그인에 실패했습니다.'),
    [adoptSession, authClient, serviceKey],
  );

  /** WO-2D: 약관/개인정보(+마케팅) 동의 후 Google 계정으로 계정 생성 + 세션. */
  const signupWithGoogle = useCallback(
    (idToken: string, consents: GoogleSignupConsents): Promise<AuthLoginResult<TUser>> =>
      adoptSession(() => authClient.signupWithGoogle(idToken, consents), 'Google 계정 생성에 실패했습니다.'),
    [adoptSession, authClient],
  );

  /**
   * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 이메일(로그인 ID) + 비밀번호 로그인.
   * 인증 전 이메일은 `code === 'EMAIL_NOT_VERIFIED'` — 호출부는 확인 메일 재발송을 안내한다.
   * 관리자(platform 역할)는 비밀번호 세션을 받지 못한다(서버 판정 · Google 전용).
   */
  const loginWithEmail = useCallback(
    (email: string, password: string): Promise<AuthLoginResult<TUser>> => {
      if (!authClient.loginWithEmail) {
        return Promise.resolve({ success: false, error: '이메일 로그인을 사용할 수 없습니다.' });
      }
      const login = authClient.loginWithEmail.bind(authClient);
      // 세션 서비스는 서버가 요청 Origin 으로 판정한다(body serviceKey 를 받지 않는다 — Guard Rule 4).
      return adoptSession(() => login(email, password), '로그인에 실패했습니다.', true);
    },
    [adoptSession, authClient],
  );

  const loginWithKakao = useCallback((proof: SocialProof): Promise<AuthLoginResult<TUser>> =>
    authClient.loginWithKakao ? adoptSession(() => authClient.loginWithKakao!(proof), '카카오 로그인에 실패했습니다.', true)
      : Promise.resolve({ success: false, error: '카카오 로그인은 준비 중입니다.' }), [adoptSession, authClient]);
  const signupWithKakao = useCallback((token: string, input: KakaoSignupRequest): Promise<AuthLoginResult<TUser>> =>
    authClient.signupWithKakao ? adoptSession(() => authClient.signupWithKakao!(token, input), '카카오 가입에 실패했습니다.', true)
      : Promise.resolve({ success: false, error: '카카오 가입은 준비 중입니다.' }), [adoptSession, authClient]);

  const logout = useCallback(async () => {
    sessionGeneration.current += 1;
    setPendingPolicyAcceptances([]); setUser(null);
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

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    pendingPolicyAcceptances,
    acceptPendingPolicies,
    loginWithGoogle,
    signupWithGoogle,
    loginWithKakao, signupWithKakao,
    loginWithEmail,
    logout,
    refresh,
    setUser,
  };
}
