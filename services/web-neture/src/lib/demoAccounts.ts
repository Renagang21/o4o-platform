import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
/**
 * Demo 체험 계정 — WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 공통 @o4o/auth-utils 의 PUBLIC_DEMO_ACCOUNTS 를 사용한다. 이 파일은 Neture 착지만 정의한다.
 *
 *   - 공개 체험 계정이다(정본 문서에 공개된 값) — 비밀이 아니지만 화면에 보이지 않는다.
 *     버튼이 기존 이메일 로그인(`loginWithEmail`)을 그대로 호출하고, 입력칸을 채우지 않는다.
 *   - 여기 email 은 **로그인 요청에만** 쓴다. Demo 여부 판정은 서버 `user.demo`
 *     (`demo_accounts.user_id`) 가 정본이다 — email 문자열을 비교해 Demo 를 판정하지 않는다.
 *   - 화면 접근은 정상 service role, 데이터 범위는 ownership — Demo 전용 우회 경로 없음.
 */

export type DemoAccountType = 'STORE_OWNER' | 'SUPPLIER';

/** 서버 `/auth/me` · email 로그인 응답의 `user.demo` (일반 사용자는 isDemo:false). */
export interface DemoMetadata {
  isDemo: boolean;
  demoType: DemoAccountType | null;
}

/**
 * 로그인 성공 후 착지:
 *   - internal      : Neture 내부 route
 *   - storeWorkspace: 홈 매장 버튼과 같은 handoff 로 그 매장의 Store Workspace
 */
export type DemoLanding = { kind: 'internal'; to: string } | { kind: 'storeWorkspace' };

export interface DemoAccountEntry {
  type: DemoAccountType;
  /** 버튼 라벨 */
  label: string;
  email: string;
  password: string;
  landing: DemoLanding;
}

export const DEMO_ACCOUNTS: readonly DemoAccountEntry[] = [
  {
    type: 'STORE_OWNER',
    label: '매장 경영자 Demo 체험',
    email: PUBLIC_DEMO_ACCOUNTS[0].email,
    password: PUBLIC_DEMO_ACCOUNTS[0].password,
    landing: { kind: 'storeWorkspace' },
  },
  {
    type: 'SUPPLIER',
    label: '공급자 Demo 체험',
    email: PUBLIC_DEMO_ACCOUNTS[1].email,
    password: PUBLIC_DEMO_ACCOUNTS[1].password,
    landing: { kind: 'internal', to: '/supplier/dashboard' },
  },
];

export const DEMO_NOTICE = 'Demo 계정으로 체험 중입니다. 일부 변경 기능은 제한됩니다.';

export const DEMO_LOGIN_MESSAGES = {
  auth: 'Demo 체험 계정 로그인이 실패했습니다.',
  permission: 'Demo 계정의 체험 권한을 확인할 수 없습니다.',
  server: '현재 Demo 체험을 시작할 수 없습니다.',
  storeMove: '매장 Demo 화면으로 이동하지 못했습니다. 홈의 매장 버튼으로 다시 시도해 주세요.',
} as const;

/** 서버가 Demo 계정의 변경 요청을 막을 때 돌려주는 code (`demo-account.service.ts`) */
export const DEMO_ACCOUNT_FORBIDDEN_CODE = 'DEMO_ACCOUNT_FORBIDDEN';
export const DEMO_ACCOUNT_FORBIDDEN_NOTICE = 'Demo 계정에서는 이 기능을 사용할 수 없습니다. 체험용 계정 정보는 고정되어 있습니다.';

/** API user → `user.demo`. 필드가 없거나 형식이 다르면 Demo 아님(배지 미표시). */
export function readDemoMetadata(apiUser: unknown): DemoMetadata {
  const raw = (apiUser as { demo?: { isDemo?: unknown; demoType?: unknown } } | null)?.demo;
  const demoType = raw?.demoType === 'STORE_OWNER' || raw?.demoType === 'SUPPLIER' ? raw.demoType : null;
  return raw?.isDemo === true && demoType ? { isDemo: true, demoType } : { isDemo: false, demoType: null };
}

/** Demo 버튼 로그인 실패 → 사용자 문구 3종 (인증 · 권한 · 서버). */
export function demoLoginErrorMessage(result: { code?: string; status?: number }): string {
  if (result.status === 401 || result.status === 400) return DEMO_LOGIN_MESSAGES.auth;
  if (result.status === 403 || result.code === DEMO_ACCOUNT_FORBIDDEN_CODE) return DEMO_LOGIN_MESSAGES.permission;
  return DEMO_LOGIN_MESSAGES.server;
}

/**
 * API 오류 → 화면 문구. Demo 차단(`DEMO_ACCOUNT_FORBIDDEN`)이면 Demo 안내, 아니면 fallback.
 * axios 오류(`response.data.code`)와 `{ code }` 결과 객체를 둘 다 받는다.
 */
export function demoAwareErrorMessage(error: unknown, fallback: string): string {
  const e = error as { code?: unknown; response?: { data?: { code?: unknown } } } | null;
  const code = e?.response?.data?.code ?? e?.code;
  return code === DEMO_ACCOUNT_FORBIDDEN_CODE ? DEMO_ACCOUNT_FORBIDDEN_NOTICE : fallback;
}
