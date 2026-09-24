/**
 * O4O 홈 복귀 — WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1
 *
 * 서비스 화면에서 "O4O 홈"을 누르면 로그인 상태를 유지한 채 O4O 대표 진입(neture.co.kr)으로 돌아간다.
 *   - 로그인 중: `POST /auth/handoff { targetServiceKey: 대표 진입, returnPath: '/' }` → 발급된 1회용 주소로 현재 탭 이동.
 *     (서버가 neture membership 없이도 활성 계정이면 발급한다. membership·role 은 만들지 않는다.)
 *   - 비로그인: 대표 홈 주소로 그냥 이동한다 (복귀할 세션이 없다).
 *   - "O4O 홈"은 로그아웃이 아니다 — logout API · 토큰 삭제를 호출하지 않는다.
 *
 * 클릭 · 복구 상태 (§7-3):
 *   상태는 모듈 단위 하나다 — 같은 화면의 데스크톱/모바일 버튼이 동시에 눌려도 발급은 1회.
 *   드롭다운이 닫혀 버튼이 사라져도 진행 중 이동은 취소하지 않는다.
 *   뒤로가기(bfcache) 복원 시 `pageshow(persisted)` 에서 세대를 올리고 busy 를 푼다 —
 *   복원 이전에 시작된 늦은 응답은 세대가 달라 이동도 오류 표시도 하지 않는다.
 *
 * 토큰 값은 로그 · 화면에 남기지 않는다. 이 파일에 서비스명 조건문을 두지 않는다.
 */
import { useCallback, useSyncExternalStore } from 'react';

/** O4O 대표 진입 serviceKey — api-server `REPRESENTATIVE_ENTRY_SERVICE_KEY` 와 1:1. */
export const REPRESENTATIVE_ENTRY_SERVICE_KEY = 'neture';
/** O4O 대표 홈 주소 — service-catalog 의 neture domain. */
export const O4O_HOME_URL = 'https://neture.co.kr/';
export const O4O_HOME_LABEL = 'O4O 홈';
/** 전역 로그아웃(모든 서비스 세션 종료) 표기 — 서버 logout 이 사용자 refresh family 전체를 폐기한다. */
export const O4O_LOGOUT_LABEL = 'O4O 로그아웃';

/** 각 앱의 인증 API 클라이언트(axios 인스턴스 · AuthClient.api) 최소 형태 */
export interface O4OHomeApiLike {
  post: (url: string, body: unknown) => Promise<{ data?: unknown }>;
}

export interface O4OHomeReturnOptions {
  api: O4OHomeApiLike;
  isAuthenticated: boolean;
  /** 테스트 주입용. 기본 `O4O_HOME_URL` */
  homeUrl?: string;
  /** 테스트 주입용. 기본 `window.location.assign` */
  navigate?: (url: string) => void;
}

export interface O4OHomeReturn {
  goHome: () => void;
  busy: boolean;
  error: string | null;
}

/** 401 계열 — 세션이 이미 끝났다. 로그인 없이 대표 홈으로 보낸다(로그인된 것처럼 표시하지 않는다). */
const SESSION_ENDED_CODES = new Set(['AUTH_REQUIRED', 'HANDOFF_SESSION_REVOKED', 'INVALID_USER', 'TOKEN_FAMILY_REVOKED']);

const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE: '이용할 수 없는 계정 상태라 O4O 홈으로 이동할 수 없습니다.',
  ACCOUNT_ACCESS_RESTRICTED: '가입 승인 상태를 확인한 뒤 O4O 홈을 이용할 수 있습니다.',
};
const GENERIC_ERROR = 'O4O 홈으로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.';

// ── 모듈 단위 상태 ────────────────────────────────────────────────────────────
type Snapshot = { busy: boolean; error: string | null };
let snapshot: Snapshot = { busy: false, error: null };
let generation = 0;
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const getSnapshot = () => snapshot;

let pageShowInstalled = false;
function installPageShowReset(): void {
  if (pageShowInstalled || typeof window === 'undefined') return;
  pageShowInstalled = true;
  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (!event.persisted) return; // 최초 로드 · 새로고침은 이미 초기 상태다
    generation += 1;
    if (snapshot.busy || snapshot.error) setSnapshot({ busy: false, error: null });
  });
}

function extractTargetUrl(data: unknown): string | undefined {
  const body = data as { data?: { targetUrl?: unknown }; targetUrl?: unknown } | undefined;
  const url = body?.data?.targetUrl ?? body?.targetUrl;
  return typeof url === 'string' ? url : undefined;
}

/** 발급 주소가 대표 홈 origin 의 /handoff 인지 확인 — 다른 곳으로는 이동하지 않는다. */
function isExpectedHandoffUrl(url: string | undefined, homeUrl: string): url is string {
  if (!url) return false;
  try {
    const target = new URL(url);
    const home = new URL(homeUrl);
    return target.protocol === 'https:' && target.origin === home.origin && target.pathname === '/handoff';
  } catch {
    return false;
  }
}

/** 테스트 전용 — 모듈 상태 초기화 */
export function __resetO4OHomeReturnForTest(): void {
  generation += 1;
  snapshot = { busy: false, error: null };
}

export async function startO4OHomeReturn({
  api,
  isAuthenticated,
  homeUrl = O4O_HOME_URL,
  navigate = (url: string) => window.location.assign(url),
}: O4OHomeReturnOptions): Promise<void> {
  installPageShowReset();
  if (snapshot.busy) return; // 진행 중 중복 클릭 — 발급 1회
  if (!isAuthenticated) {
    navigate(homeUrl);
    return;
  }
  const mine = ++generation;
  setSnapshot({ busy: true, error: null });
  try {
    const res = await api.post('/auth/handoff', {
      targetServiceKey: REPRESENTATIVE_ENTRY_SERVICE_KEY,
      returnPath: '/',
    });
    if (mine !== generation) return; // 복원 이후 늦게 도착한 응답
    const targetUrl = extractTargetUrl(res?.data);
    if (!isExpectedHandoffUrl(targetUrl, homeUrl)) {
      setSnapshot({ busy: false, error: GENERIC_ERROR });
      return;
    }
    // 성공 — 현재 탭 이동. busy 는 pageshow(복원) 에서 푼다.
    navigate(targetUrl);
  } catch (err: unknown) {
    if (mine !== generation) return;
    const response = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
    const code = response?.data?.code ?? '';
    if (SESSION_ENDED_CODES.has(code) || response?.status === 401) {
      navigate(homeUrl);
      return;
    }
    setSnapshot({ busy: false, error: ERROR_MESSAGES[code] ?? GENERIC_ERROR });
  }
}

export function useO4OHomeReturn(options: O4OHomeReturnOptions): O4OHomeReturn {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { api, isAuthenticated, homeUrl, navigate } = options;
  const goHome = useCallback(() => {
    void startO4OHomeReturn({ api, isAuthenticated, homeUrl, navigate });
  }, [api, isAuthenticated, homeUrl, navigate]);
  return { goHome, busy: state.busy, error: state.error };
}

export interface O4OHomeButtonProps extends O4OHomeReturnOptions {
  className?: string;
  errorClassName?: string;
  /** 기본 'O4O 홈' */
  label?: string;
}

/**
 * 스타일은 각 앱이 className 으로 준다. 오류는 버튼 바로 아래 role="alert" 로 보인다.
 * 오류가 보이도록 클릭 시 메뉴·drawer 를 닫지 않는다(성공하면 어차피 탭이 이동한다).
 */
export function O4OHomeButton({ className, errorClassName, label = O4O_HOME_LABEL, ...options }: O4OHomeButtonProps) {
  const { goHome, busy, error } = useO4OHomeReturn(options);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={goHome}
        disabled={busy}
        aria-busy={busy || undefined}
        data-testid="o4o-home-button"
      >
        {busy ? `${label}으로 이동 중…` : label}
      </button>
      {error && (
        <span role="alert" className={errorClassName} style={errorClassName ? undefined : { display: 'block', fontSize: 12, color: '#dc2626' }}>
          {error}
        </span>
      )}
    </>
  );
}
