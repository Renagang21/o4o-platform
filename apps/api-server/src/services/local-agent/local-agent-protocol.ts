/**
 * Local Work Agent — 프로토콜 계약 (순수)
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   action    = Local Agent 가 실행할 수 있는 **허용된 작업 이름**
 *   envelope  = 서버 → agent 명령 / agent → 서버 결과의 형상
 *   errorCode = 실패를 AI 응답까지 안전하게 전달하기 위한 정규화된 코드
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ Local Agent 는 원격 제어기가 아니다 (§4)
 *
 *   이 프로토콜에는 **명령 문자열을 실어 보낼 필드가 없다.** `action` 은 아래 상수 집합의
 *   값이어야 하고, agent 는 자기 allowlist 에 있는 이름만 실행한다. 서버가 실수로
 *   `local.exec_shell` 을 보내도 agent 가 `DENIED_UNKNOWN_ACTION` 으로 되돌린다(§28).
 *
 *   shell · PowerShell · cmd · 임의 프로세스 · 파일 · 레지스트리 · 브라우저 · 데스크톱 입력은
 *   **프로토콜 레벨에서 표현 불가능**하다. 표현할 수 없는 것은 실수로 열 수도 없다.
 */

import { WINDOWS_APP_IDS } from './windows-app-registry.js';
import { BROWSER_SITE_IDS } from './browser-site-registry.js';

// ─── Action ──────────────────────────────────────────────────────────────────

/**
 * V0 action 집합 — **read-only 2개뿐**(§19·§20·§21).
 *
 * 이름을 미리 늘려두지 않는다. `local.read_file` 같은 이름이 상수로 존재하는 순간
 * "있으니 곧 열어도 된다" 는 압력이 생긴다(직전 WO 의 capability 판단을 그대로 승계).
 */
export const LOCAL_AGENT_ACTIONS = {
  /** agent 자신의 연결 상태. 실제 왕복(round trip) 검증용. */
  GET_AGENT_STATUS: 'local.get_agent_status',
  /** OS 이름·버전·아키텍처 등 **안전 필드만**. §21 금지 목록 참조. */
  GET_SYSTEM_INFO: 'local.get_system_info',
  /** 등재된 Windows 앱이 실행 중인지 조회 (WINDOWS-APP-WINDOW-CONTROL-V0 §12). */
  FIND_APPLICATION: 'local.find_application',
  /** 등재된 Windows 앱의 창을 앞으로 가져온다 (동 §13). */
  ACTIVATE_WINDOW: 'local.activate_window',
  /** 등재 사이트 기준 브라우저 실행 여부 (BROWSER-CONTROL-V0 §13). 탭은 열거하지 않는다. */
  BROWSER_GET_SITE_STATUS: 'local.browser.get_site_status',
  /** 등재 사이트를 Windows 기본 URL handler 로 연다 (동 §14·§15·§25). */
  BROWSER_OPEN_SITE: 'local.browser.open_site',
} as const;

export type LocalAgentAction = (typeof LOCAL_AGENT_ACTIONS)[keyof typeof LOCAL_AGENT_ACTIONS];

// ─── App 대상 action (WINDOWS-APP-WINDOW-CONTROL-V0 §9·§32) ──────────────────

/**
 * appId 를 **action 이름 안에** 싣는다. 인자 칸을 새로 만들지 않기 위해서다.
 *
 * `local_agent_commands` 에는 args 컬럼이 없다 — 직전 WO 가 "인자를 담을 칸이 없으면
 * 나중에 인자를 몰래 실어 보낼 수도 없다" 는 이유로 일부러 그렇게 만들었고,
 * 이번 WO 는 `DB migration = 0` 이다(§38). 그래서 자유 문자열 인자를 새로 만드는 대신
 * **appId 까지 포함한 완성된 action 문자열 자체를 allowlist 로 고정**한다.
 *
 * 결과적으로 전송 가능한 action 은 아래 `LOCAL_AGENT_ACTION_ALLOWLIST` 의 유한 집합뿐이고,
 * 등재되지 않은 appId 는 **프로토콜 레벨에서 표현 불가능**하다. envelope 형상은 그대로다.
 */
export const LOCAL_APP_ACTION_SEPARATOR = '#';

/** appId 를 필요로 하는 action 들. */
export const APP_TARGET_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.FIND_APPLICATION,
  LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW,
]);

export function composeAppAction(base: string, appId: string): string {
  return `${base}${LOCAL_APP_ACTION_SEPARATOR}${appId}`;
}

// ─── Site 대상 action (BROWSER-CONTROL-V0 §10·§11·§44) ───────────────────────

/**
 * siteId 도 appId 와 **똑같은 방식**으로 action 이름 안에 싣는다.
 *
 * URL 은 이 문자열 어디에도 없다. 서버는 siteId 만 보내고, agent 가 자기 등재부에서 URL 을
 * 꺼낸다. 즉 "AI 가 만든 URL" · "사용자가 말한 URL" · `javascript:`/`file:`/`data:` 는
 * **프로토콜 레벨에서 표현 불가능**하다(§10). 등재되지 않은 siteId 역시 allowlist 에 없다.
 */
export const SITE_TARGET_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.BROWSER_GET_SITE_STATUS,
  LOCAL_AGENT_ACTIONS.BROWSER_OPEN_SITE,
]);

export function composeSiteAction(base: string, siteId: string): string {
  return composeAppAction(base, siteId);
}

/** action 문자열을 base 와 appId 로 나눈다. appId 가 없는 action 이면 appId 는 undefined. */
export function parseLocalAction(action: string): { base: string; appId?: string } {
  const idx = String(action ?? '').indexOf(LOCAL_APP_ACTION_SEPARATOR);
  if (idx < 0) return { base: String(action ?? '') };
  return {
    base: String(action).slice(0, idx),
    appId: String(action).slice(idx + LOCAL_APP_ACTION_SEPARATOR.length),
  };
}

/**
 * 서버가 발행을 허용하는 action (§29). agent 쪽 allowlist 와 짝을 이룬다(§28).
 *
 * app 대상 action 은 **등재된 appId 하나당 한 항목씩** 펼쳐진다. 목록 길이는
 * `2 + 2 × 등재 앱 수` 로 유한하며, registry 에 없는 앱은 여기에 나타나지 않는다.
 */
export const LOCAL_AGENT_ACTION_ALLOWLIST: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS,
  LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
  ...APP_TARGET_ACTIONS.flatMap((base) =>
    WINDOWS_APP_IDS.map((appId) => composeAppAction(base, appId)),
  ),
  // BROWSER-CONTROL-V0: 등재 siteId 하나당 한 항목씩. registry 에 없는 사이트는 여기 없다.
  ...SITE_TARGET_ACTIONS.flatMap((base) =>
    BROWSER_SITE_IDS.map((siteId) => composeSiteAction(base, siteId)),
  ),
]);

export function isAllowedLocalAction(action: string): boolean {
  return LOCAL_AGENT_ACTION_ALLOWLIST.includes(action);
}

// ─── Envelope ────────────────────────────────────────────────────────────────

/**
 * 서버 → agent 명령 (§17).
 *
 * `args` 는 **여전히 빈 객체다.** 자유 문자열 인자를 이 envelope 에 새로 열지 않는다 —
 * appId 는 allowlist 로 고정된 `action` 문자열 안에 들어 있다(위 `composeAppAction`).
 * 그래서 이번 WO 도 envelope 형상·DB 스키마를 바꾸지 않는다(§32·§38).
 *
 * `action` 이 `string` 인 것은 app 대상 action 이 `base#appId` 로 조립되기 때문이다.
 * 값의 유효성은 타입이 아니라 **`isAllowedLocalAction` 이 판정한다**(양쪽 allowlist).
 */
export interface LocalCommand {
  commandId: string;
  action: string;
  args: Record<string, never>;
  issuedAt: string;
  expiresAt: string;
}

export type LocalCommandStatus = 'success' | 'denied' | 'failed' | 'expired';

/** agent → 서버 결과 (§17). */
export interface LocalCommandResult {
  commandId: string;
  status: LocalCommandStatus;
  data?: Record<string, unknown>;
  errorCode?: string;
}

// ─── Error codes ─────────────────────────────────────────────────────────────

/**
 * 실패는 전부 여기로 정규화된다(§30·§31). AI 는 이 코드만 보고 안내 문장을 만든다 —
 * 내부 예외 메시지·스택·경로가 사용자에게 새지 않는다.
 */
export const LOCAL_AGENT_ERROR = {
  /** 등록된 device 가 없다. */
  NO_DEVICE: 'LOCAL_AGENT_NO_DEVICE',
  /** device 는 있으나 heartbeat 가 끊겼다. */
  OFFLINE: 'LOCAL_AGENT_OFFLINE',
  /** active device 가 2개 이상 — 임의 선택하지 않는다(§33). */
  AMBIGUOUS: 'LOCAL_DEVICE_AMBIGUOUS',
  /** 제한 시간 안에 결과가 오지 않았다(§30). */
  TIMEOUT: 'LOCAL_AGENT_TIMEOUT',
  /** agent 가 모르는 action 을 받았다(§28). */
  DENIED_UNKNOWN_ACTION: 'DENIED_UNKNOWN_ACTION',
  /** 이미 실행된 commandId 가 다시 들어왔다(§18). */
  REPLAY_REJECTED: 'LOCAL_COMMAND_REPLAY_REJECTED',
  /** expiresAt 을 지난 명령(§18). */
  EXPIRED: 'LOCAL_COMMAND_EXPIRED',
  /** agent 내부 실행 실패. */
  EXECUTION_FAILED: 'LOCAL_AGENT_EXECUTION_FAILED',

  // ── Windows App / Window Control V0 (§14·§16·§18) ──────────────────────────
  /** registry 에 없는 appId (§10). */
  APP_NOT_REGISTERED: 'WINDOWS_APP_NOT_REGISTERED',
  /** 등재 앱이지만 지금 실행 중이 아니다 → 사용자가 직접 실행해야 한다(§14). */
  APP_NOT_RUNNING: 'WINDOWS_APP_NOT_RUNNING',
  /** 대상 창이 2개 이상이다. **임의로 고르지 않는다**(§16). */
  APP_WINDOW_AMBIGUOUS: 'WINDOWS_APP_WINDOW_AMBIGUOUS',
  /** 창은 찾았지만 Windows 가 foreground 전환을 받아주지 않았다(§18). */
  WINDOW_ACTIVATION_FAILED: 'WINDOW_ACTIVATION_FAILED',

  // ── Browser Control V0 (§45) ───────────────────────────────────────────────
  /** registry 에 없는 siteId (§11). */
  SITE_NOT_REGISTERED: 'BROWSER_SITE_NOT_REGISTERED',
  /** 기본 URL handler 호출이 실패했다. */
  BROWSER_OPEN_FAILED: 'BROWSER_OPEN_FAILED',
  /** 지원 브라우저가 없거나 이 플랫폼에서 열 수 없다. */
  BROWSER_NOT_AVAILABLE: 'BROWSER_NOT_AVAILABLE',
  /** 로그인은 사용자가 직접 해야 한다 — O4O 가 대행하지 않는다(§4·§31). */
  LOGIN_USER_ACTION_REQUIRED: 'LOGIN_USER_ACTION_REQUIRED',
} as const;

export type LocalAgentErrorCode = (typeof LOCAL_AGENT_ERROR)[keyof typeof LOCAL_AGENT_ERROR];

// ─── Safe system info ────────────────────────────────────────────────────────

/**
 * `local.get_system_info` 가 되돌릴 수 있는 **유일한** 필드 집합 (§21).
 *
 * 서버는 agent 응답에서 이 목록 밖의 키를 **버린다**. agent 를 신뢰해서 통과시키지 않는다 —
 * agent 가 (변조되었든 버그든) 추가 필드를 실어 보내도 프롬프트까지 가지 못한다.
 *
 * 금지(§21): username · home directory · IP · MAC · 설치 소프트웨어 목록 ·
 * environment variables · disk contents · process list.
 */
export const SAFE_SYSTEM_INFO_FIELDS: readonly string[] = Object.freeze([
  'osName',
  'osVersion',
  'architecture',
  'agentVersion',
  'deviceName',
]);

export function pickSafeSystemInfo(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SAFE_SYSTEM_INFO_FIELDS) {
    const v = src[key];
    // 문자열만 통과시킨다. 객체를 넣어 임의 구조를 밀어 넣는 경로를 막는다.
    if (typeof v === 'string' && v.length > 0) out[key] = v.slice(0, 120);
  }
  return out;
}

// ─── Safe window info (WINDOWS-APP-WINDOW-CONTROL-V0 §20·§21) ───────────────

/**
 * app / window action 이 되돌릴 수 있는 **유일한** 필드 집합.
 *
 * `pickSafeSystemInfo` 와 같은 규칙이다: agent 가 무엇을 실어 보내든 이 목록 밖의 키는
 * 서버가 버린다. 따라서 아래 값들은 DB 에도 프롬프트에도 **도달할 수 없다**(§20·§21):
 *
 *   전체 process 목록 · PID · 창 핸들(HWND) · 창 제목 · executable 전체 경로 ·
 *   Windows 사용자 경로 · Program Files 설치 경로 · command line 인자
 *
 * `displayName` 은 registry 의 표시 이름이고, 서버는 그마저도 자기 registry 값으로
 * 다시 덮어쓴다(agent 가 주장하는 이름을 그대로 읽어주지 않는다).
 */
export const SAFE_WINDOW_INFO_FIELDS: readonly string[] = Object.freeze([
  'appId',
  'displayName',
  'state',
]);

/** 숫자로 통과시키는 필드 — 창 **개수** 뿐이다. 핸들·PID 는 여기에 없다. */
const SAFE_WINDOW_INFO_NUMBER_FIELDS: readonly string[] = Object.freeze(['windowCount']);

/** 불리언으로 통과시키는 필드. */
const SAFE_WINDOW_INFO_BOOLEAN_FIELDS: readonly string[] = Object.freeze([
  'found',
  'activated',
  'restored',
]);

export function pickSafeWindowInfo(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SAFE_WINDOW_INFO_FIELDS) {
    const v = src[key];
    if (typeof v === 'string' && v.length > 0) out[key] = v.slice(0, 60);
  }
  for (const key of SAFE_WINDOW_INFO_NUMBER_FIELDS) {
    const v = src[key];
    // 정수 개수만. 큰 값도 잘라낸다 — 창 개수가 수십을 넘을 이유가 없다.
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) out[key] = Math.min(v, 99);
  }
  for (const key of SAFE_WINDOW_INFO_BOOLEAN_FIELDS) {
    const v = src[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  return out;
}

// ─── Safe browser info (BROWSER-CONTROL-V0 §46·§47) ─────────────────────────

/**
 * 브라우저 tool 이 되돌릴 수 있는 **유일한** 필드 집합.
 *
 * 금지(§46): 전체 history · 열린 tab 목록 · cookie · session token · saved password ·
 * profile 경로 · Windows username · URL 전체. `browserType` 은 'chrome'|'edge' 두 값뿐이다.
 * `displayName` 은 서버 registry 값으로 다시 덮어쓴다(agent 주장을 그대로 읽지 않는다).
 */
export const SAFE_BROWSER_INFO_FIELDS: readonly string[] = Object.freeze([
  'siteId',
  'displayName',
  'browserType',
]);

const SAFE_BROWSER_INFO_BOOLEAN_FIELDS: readonly string[] = Object.freeze([
  'opened',
  'browserRunning',
  'browserWasRunning',
  'activated',
]);

const SAFE_BROWSER_TYPES: readonly string[] = Object.freeze(['chrome', 'edge']);

export function pickSafeBrowserInfo(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SAFE_BROWSER_INFO_FIELDS) {
    const v = src[key];
    if (typeof v !== 'string' || v.length === 0) continue;
    if (key === 'browserType' && !SAFE_BROWSER_TYPES.includes(v)) continue;
    out[key] = v.slice(0, 60);
  }
  for (const key of SAFE_BROWSER_INFO_BOOLEAN_FIELDS) {
    const v = src[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  // siteKnownOpen 은 V0 에서 null(미판정)만 허용한다. true 를 추측해 싣지 못하게 한다(§13).
  if (src.siteKnownOpen === null) out.siteKnownOpen = null;
  return out;
}

/**
 * action 에 맞는 출력 화이트리스트를 고른다.
 *
 * **모르는 action 은 빈 객체를 돌려준다.** 새 action 을 추가하면서 여기에 등록하지 않으면
 * 데이터가 새는 것이 아니라 **아무것도 통과하지 못한다**. 실수의 방향을 안전한 쪽으로 둔다.
 */
export function pickSafeResultData(action: string, data: unknown): Record<string, unknown> {
  const { base } = parseLocalAction(action);
  if (base === LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO || base === LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS) {
    return pickSafeSystemInfo(data);
  }
  if (APP_TARGET_ACTIONS.includes(base)) {
    return pickSafeWindowInfo(data);
  }
  if (SITE_TARGET_ACTIONS.includes(base)) {
    return pickSafeBrowserInfo(data);
  }
  return {};
}

// ─── Device identity ─────────────────────────────────────────────────────────

/**
 * §10. **hardware fingerprint 를 쓰지 않는다** — MAC · 시리얼 · CPU id 모두 금지.
 * `deviceId` 는 서버가 발급하는 random UUID 다. agent 가 주장하는 값이 아니다.
 */
export interface LocalDeviceIdentity {
  deviceId: string;
  deviceName?: string;
  platform: 'windows';
  agentVersion: string;
}

/** V0 는 Windows 만 검증한다(§9). 그 외 platform 값은 등록 자체를 거부한다. */
export const SUPPORTED_AGENT_PLATFORMS: readonly string[] = Object.freeze(['windows']);
