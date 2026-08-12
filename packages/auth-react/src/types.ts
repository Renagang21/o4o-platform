/**
 * @o4o/auth-react — 공통 계약 타입
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * 이 패키지의 계약은 **KPA-Society ∩ Neture 최소 공통집합**이다.
 * 어느 한 서비스의 상위집합이 아니며, 서비스 고유 상태·행동은 Extension 으로 주입/합성한다.
 */

/** 로그인 결과 — Neture 방식(result object)으로 통일. 절대 throw 하지 않는다. */
export interface AuthLoginResult<TUser> {
  success: boolean;
  /** 사용자에게 보여줄 문구(resolveAuthError 산출). 성공 시 undefined. */
  error?: string;
  /**
   * 서버 응답 code 원문. `SERVICE_NOT_MEMBER` 등 서비스별 안내 UX 분기에 쓰인다.
   * 이 값이 필요해서 throw 대신 result object 를 canonical 로 택했다.
   */
  code?: string;
  /**
   * HTTP 상태코드. 서비스가 code 로 구분되지 않는 분기(예: 429 rate limit)에서 쓴다.
   * 기존 서비스들이 catch 블록에서 `err.response.status` 로 하던 분기를 보존하기 위한 필드다.
   */
  status?: number;
  /** 성공 시 변환된 사용자. 실패 시 undefined. */
  user?: TUser;
}

/** 이 패키지가 요구하는 authClient 의 최소 표면(@o4o/auth-client 인스턴스가 충족). */
export interface AuthClientLike {
  login(input: { email: string; password: string; serviceKey?: string }): Promise<unknown>;
  logout(): Promise<unknown>;
  api: {
    get(url: string): Promise<{ data: unknown }>;
    post(url: string, body?: unknown): Promise<{ data: unknown }>;
  };
}

/** 서비스가 주입하는 설정 = Extension 경계. */
export interface ServiceAuthConfig<TUser> {
  /**
   * canonical service key (`service_memberships.service_key`).
   * role prefix(`kpa`,`cosmetics`)가 아니라 canonical(`kpa-society`,`k-cosmetics`)을 넘긴다.
   * 변환이 필요하면 `@o4o/security-core`의 `resolveCanonicalServiceKey()` 를 쓴다 —
   * **이 패키지 안에 서비스명 조건문을 두지 않는다.**
   */
  serviceKey: string;
  /** 서비스별 authClient 인스턴스(KPA 는 localStorage 전략 전용 인스턴스를 쓴다). */
  authClient: AuthClientLike;
  /** API 사용자 payload → 서비스 User 타입. 서비스별 필드 확장은 여기서 한다. */
  toUser: (apiUser: Record<string, unknown>) => TUser;
  /** 현재 저장된 access token 조회(없으면 세션 복구를 건너뛴다). */
  getAccessToken: () => string | null;
  /**
   * 인증 확정 직후 훅(로그인 성공 / 세션 복구 성공 공통).
   * KPA 의 `/kpa/me-context` 후속 로딩처럼 서비스 고유 컨텍스트를 채울 때 쓴다.
   * fire-and-forget 이며 실패해도 인증 상태를 되돌리지 않는다.
   */
  onAuthenticated?: (user: TUser) => void;
  /** 세션 복구 엔드포인트. 기본 `/auth/me`. */
  meEndpoint?: string;
  /** 전체 로그아웃 엔드포인트. 기본 `/auth/logout-all`. */
  logoutAllEndpoint?: string;
  /**
   * `logoutAll()` 이 로컬 세션(user)까지 비울지 여부. 기본 `true`.
   *
   * Neture / K-Cosmetics / GlycoPharm 은 기존에 서버 호출만 하고 로컬 user 는 유지했다.
   * 그 차이를 서비스별 중복 구현으로 두지 않고 **명시적 설정 1개**로 표현한다.
   */
  clearSessionOnLogoutAll?: boolean;
}

/** Core 가 제공하는 상태·행동(모든 서비스 공통). */
export interface ServiceAuthCore<TUser> {
  user: TUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthLoginResult<TUser>>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  /** 세션 재확인(기존 KPA `checkAuth` 와 동일 의미). */
  refresh: () => Promise<void>;
  /** 서비스 고유 액션이 사용자 상태를 갱신해야 할 때(예: KPA me-context merge). */
  setUser: React.Dispatch<React.SetStateAction<TUser | null>>;
}
