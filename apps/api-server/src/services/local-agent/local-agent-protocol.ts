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
} as const;

export type LocalAgentAction = (typeof LOCAL_AGENT_ACTIONS)[keyof typeof LOCAL_AGENT_ACTIONS];

/** 서버가 발행을 허용하는 action (§29). agent 쪽 allowlist 와 짝을 이룬다(§28). */
export const LOCAL_AGENT_ACTION_ALLOWLIST: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS,
  LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
]);

export function isAllowedLocalAction(action: string): action is LocalAgentAction {
  return LOCAL_AGENT_ACTION_ALLOWLIST.includes(action);
}

// ─── Envelope ────────────────────────────────────────────────────────────────

/**
 * 서버 → agent 명령 (§17).
 *
 * `args` 는 형상만 남겨둔 자리다. V0 의 두 action 은 **인자를 받지 않는다** —
 * 직전 WO 가 `validateToolArguments` 로 고정한 판단(식별자를 인자로 넘기지 않는다)과 같다.
 */
export interface LocalCommand {
  commandId: string;
  action: LocalAgentAction;
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
