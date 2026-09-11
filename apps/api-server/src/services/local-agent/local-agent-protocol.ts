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
 *   shell · PowerShell · cmd · 임의 프로세스 · 파일 · 레지스트리 · 임의 브라우저 제어 ·
 *   임의 데스크톱 입력은 **프로토콜 레벨에서 표현 불가능**하다. 표현할 수 없는 것은 실수로
 *   열 수도 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPUTER-USE-V0 정정 — `args` 는 더 이상 항상 빈 객체가 아니다
 *
 *   Computer Use 4개 action(`local.computer.*`)은 **타입이 고정된 인자**를 실어 보낸다:
 *   click `{x,y}` (0..1) · type_text `{text}` (≤500자) · key `{key}` (ENTER|TAB|ESC).
 *   자유 문자열 칸이 아니다 — 형상·값 검증은 `computer-use-contract.ts` 가 하고, 서버는
 *   검증을 통과한 값만 발행하며 agent 는 같은 규칙으로 **다시** 검사한다(§20·§25·§26).
 *   그 밖의 모든 action 은 여전히 `args = {}` 다. DB 스키마는 바꾸지 않았다(§44) —
 *   인자는 발행 시 `result_data` 에 잠깐 실려 agent 가 claim 하는 순간 지워진다
 *   (`local-agent-service.ts` `claimPendingCommands`).
 */

import { WINDOWS_APP_IDS } from './windows-app-registry.js';
import { BROWSER_SITE_IDS } from './browser-site-registry.js';
import {
  COMPUTER_ALLOWED_KEYS,
  validateClickArgs,
  validateKeyArgs,
  validateTextArgs,
  type ComputerActionArgs,
} from './computer-use-contract.js';
import {
  BROWSER_DOM_ERROR,
  pickSafeDomInfo,
  validateDomElementArgs,
  validateDomFindArgs,
  validateDomReadTableArgs,
  validateDomSelectOptionArgs,
  validateDomSetInputArgs,
  type DomActionArgs,
} from './browser-dom-contract.js';

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
  /** 등재 앱 창의 foreground 여부·client 크기·snapshot 가능 여부 (COMPUTER-USE-V0 §14). */
  COMPUTER_INSPECT: 'local.computer.inspect',
  /** 등재 앱 창 client 영역 안 정규화 좌표 한 점을 **왼쪽 단일 클릭** (동 §15·§16·§22). */
  COMPUTER_CLICK: 'local.computer.click',
  /** 등재 앱 창에 짧은 일반 텍스트 입력 (동 §17·§18). 로그인 창 앞에서는 실행하지 않는다. */
  COMPUTER_TYPE_TEXT: 'local.computer.type_text',
  /** ENTER · TAB · ESC 중 하나 (동 §19·§20). 조합키 없음. */
  COMPUTER_KEY: 'local.computer.key',
  // ── Browser DOM Control V0 (WO-O4O-BROWSER-DOM-CONTROL-V0 §5·§38) ──────────
  /** 현재 탭이 등재 site 인가 · active · ready · pathname (§8·§9). URL query 는 없다. */
  DOM_GET_CONTEXT: 'local.browser.dom.get_context',
  /** 구조화된 element 요약 목록 + snapshotId (§10·§11). 전체 HTML 이 아니다(§12). */
  DOM_INSPECT: 'local.browser.dom.inspect',
  /** role/text/name/label/placeholder 조건으로 element 찾기 (§15). selector 없음(§16). */
  DOM_FIND: 'local.browser.dom.find',
  /** elementRef 의 정규화된 visible text (§17). password/hidden 은 제외. */
  DOM_READ_TEXT: 'local.browser.dom.read_text',
  /** input[text/search] · textarea 에 짧은 텍스트 설정 (§18). password/OTP 는 거절(§19). */
  DOM_SET_INPUT: 'local.browser.dom.set_input',
  /** native <select> 의 option 선택 (§21). */
  DOM_SELECT_OPTION: 'local.browser.dom.select_option',
  /** button/link/checkbox/radio 클릭 (§22). COMMIT 분류면 실행하지 않는다(§23·§24). */
  DOM_CLICK: 'local.browser.dom.click',
  /** table/role=table 읽기, 행 상한 있음 (§26·§27). */
  DOM_READ_TABLE: 'local.browser.dom.read_table',
  // ── Local Data Runtime bridge (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1) ────
  /** 매장 PC 로컬 SQLite 의 **상태만** — 스키마 버전·마이그레이션 정상 여부. 경로·행 없음. */
  DATA_HEALTH: 'local.data.health',
  /** allowlist 된 meta 키 하나의 값을 읽는다(§13). 임의 SQL·임의 키가 아니다. */
  DATA_GET_META: 'local.data.get_meta',
  /** allowlist 된 setting 키에 검증된 값을 쓴다(§10·§11). 범용 KV 저장이 아니다. */
  DATA_SET_SETTING: 'local.data.set_setting',
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

// ─── Computer Use 대상 action (COMPUTER-USE-V0 §8·§24) ───────────────────────

/**
 * targetId = **등재된 appId** 다. AI 는 HWND 를 지정하지 않는다 — appId 만 말하고, agent 가
 * 자기 registry 로 창을 찾는다(§8). 그래서 appId 를 `base#appId` 로 싣는 방식을 그대로 쓴다.
 *
 * `APP_TARGET_ACTIONS` 와 **분리**해 둔 이유: 창 제어 2개는 인자가 없고 출력 화이트리스트도
 * 다르다. 섞으면 "창 찾기 결과에 클릭 필드가 통과" 같은 교차가 생긴다.
 *
 * siteId 는 V0 대상이 아니다. 사이트는 로그인 단계 여부를 화면 없이 판정할 수 없어(§13·§34)
 * Browser Navigation/Interaction V0 로 미룬다.
 */
export const COMPUTER_TARGET_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT,
  LOCAL_AGENT_ACTIONS.COMPUTER_CLICK,
  LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT,
  LOCAL_AGENT_ACTIONS.COMPUTER_KEY,
]);

/** 인자를 필요로 하는 action — inspect 는 없다. 이 셋 밖의 action 에 args 가 있으면 거절한다. */
export const COMPUTER_ARGS_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.COMPUTER_CLICK,
  LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT,
  LOCAL_AGENT_ACTIONS.COMPUTER_KEY,
]);

export function composeComputerAction(base: string, targetId: string): string {
  return composeAppAction(base, targetId);
}

// ─── Browser DOM 대상 action (BROWSER-DOM-CONTROL-V0 §7·§8·§38) ──────────────

/**
 * targetId = **등재된 siteId** 다(§7). URL · origin · 탭 id 를 서버가 지정하지 않는다 — siteId 만
 * 말하고, 확장이 자기 registry 로 "현재 탭이 그 site 인가" 를 판정한다(§8). appId/siteId 와 같은
 * `base#siteId` 규칙이다.
 *
 * `SITE_TARGET_ACTIONS`(열기 축) 와 **분리**해 둔다 — 출력 화이트리스트가 다르다.
 */
export const DOM_TARGET_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.DOM_GET_CONTEXT,
  LOCAL_AGENT_ACTIONS.DOM_INSPECT,
  LOCAL_AGENT_ACTIONS.DOM_FIND,
  LOCAL_AGENT_ACTIONS.DOM_READ_TEXT,
  LOCAL_AGENT_ACTIONS.DOM_SET_INPUT,
  LOCAL_AGENT_ACTIONS.DOM_SELECT_OPTION,
  LOCAL_AGENT_ACTIONS.DOM_CLICK,
  LOCAL_AGENT_ACTIONS.DOM_READ_TABLE,
]);

/** 인자를 받는 DOM action — get_context · inspect 는 없다. read_table 은 선택적 인자. */
export const DOM_ARGS_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.DOM_FIND,
  LOCAL_AGENT_ACTIONS.DOM_READ_TEXT,
  LOCAL_AGENT_ACTIONS.DOM_SET_INPUT,
  LOCAL_AGENT_ACTIONS.DOM_SELECT_OPTION,
  LOCAL_AGENT_ACTIONS.DOM_CLICK,
  LOCAL_AGENT_ACTIONS.DOM_READ_TABLE,
]);

/** DOM action 인가 — 결과 화이트리스트 · 실패 데이터 보존 판정에 쓴다. */
export function isDomTargetAction(base: string): boolean {
  return DOM_TARGET_ACTIONS.includes(base);
}

// ─── Local Data Runtime bridge 계약 (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1) ─

/**
 * 데이터 축 action 3개. **`#appId` 를 붙이지 않는다** — 대상은 이 PC 의 단일 local.db 뿐이다.
 * 그래서 allowlist 에 조합 없이 그대로 들어간다(아래 `LOCAL_AGENT_ACTION_ALLOWLIST`).
 */
export const DATA_TARGET_ACTIONS: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.DATA_HEALTH,
  LOCAL_AGENT_ACTIONS.DATA_GET_META,
  LOCAL_AGENT_ACTIONS.DATA_SET_SETTING,
]);

/**
 * `get_meta` 로 읽을 수 있는 meta 키 — **유한 목록**이다(§13). 임의 키·임의 SQL 이 아니다.
 *
 * `local_db_id` 는 **일부러 뺐다.** 매장 PC 마다 고정된 random UUID 라, cloud 로 넘기면
 * 매장 단말을 상관(correlate)하는 안정 지문이 된다(§18 최소화). 지원에 꼭 필요해지면
 * 그때 별도 근거로 추가한다 — 없으면 새지도 않는다.
 */
export const LOCAL_DATA_META_KEYS: readonly string[] = Object.freeze([
  'schema_version',
  'created_at',
  'updated_at',
]);

/**
 * `set_setting` 이 쓸 수 있는 setting 키와 **키별 값 스키마**(§10·§11). generic KV store 가 아니다 —
 * 여기 없는 키는 저장되지 않고, 값도 키마다 정해진 형식만 통과한다.
 *
 * enum 값은 소문자 그대로 비교한다. profile id 는 등재 profile 을 가리키는 좁은 문자열이다.
 */
export const LOCAL_DATA_SETTING_KEYS: readonly string[] = Object.freeze([
  'locale',
  'preferred_export_format',
  'selected_source_profile',
]);

const LOCAL_DATA_SETTING_LOCALE_VALUES: readonly string[] = Object.freeze(['ko', 'en', 'zh', 'ja']);
const LOCAL_DATA_SETTING_EXPORT_FORMATS: readonly string[] = Object.freeze(['csv']);
const LOCAL_DATA_PROFILE_ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

/** setting 키 하나에 대한 값 검증. 통과하면 true. agent 쪽(handlers.mjs)이 같은 규칙을 다시 본다. */
export function isValidLocalSettingValue(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (key === 'locale') return LOCAL_DATA_SETTING_LOCALE_VALUES.includes(value);
  if (key === 'preferred_export_format') return LOCAL_DATA_SETTING_EXPORT_FORMATS.includes(value);
  if (key === 'selected_source_profile') return LOCAL_DATA_PROFILE_ID_RE.test(value);
  return false;
}

export interface DataGetMetaArgs {
  key: string;
}
export interface DataSetSettingArgs {
  key: string;
  value: string;
}
export type DataActionArgs = DataGetMetaArgs | DataSetSettingArgs;

/** `{ key }` — allowlist 된 meta 키 하나. 그 밖의 키·추가 필드는 실패. */
export function validateDataGetMetaArgs(args: unknown): { ok: boolean; args?: DataGetMetaArgs } {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const keys = Object.keys(args as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'key') return { ok: false };
  const key = (args as Record<string, unknown>).key;
  if (typeof key !== 'string' || !LOCAL_DATA_META_KEYS.includes(key)) return { ok: false };
  return { ok: true, args: { key } };
}

/** `{ key, value }` — allowlist 된 setting 키 + 키별 값 스키마. 그 밖은 실패. */
export function validateDataSetSettingArgs(args: unknown): { ok: boolean; args?: DataSetSettingArgs } {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const keys = Object.keys(args as Record<string, unknown>).sort();
  if (keys.length !== 2 || keys[0] !== 'key' || keys[1] !== 'value') return { ok: false };
  const { key, value } = args as Record<string, unknown>;
  if (typeof key !== 'string' || !LOCAL_DATA_SETTING_KEYS.includes(key)) return { ok: false };
  if (!isValidLocalSettingValue(key, value)) return { ok: false };
  return { ok: true, args: { key, value: value as string } };
}

/**
 * base action 에 맞는 인자 검증. 통과하면 **정규화된 사본**을 돌려준다(원본 객체를 그대로
 * 흘리지 않는다 — 추가 키가 있으면 여기서 이미 실패한다).
 *
 * 인자가 없는 action 에 인자를 붙이면 실패다. "inspect 에 text 를 실어 보내면 agent 가
 * 우연히 타이핑" 같은 경로를 형상 단계에서 끊는다.
 */
export function validateLocalCommandArgs(
  base: string,
  args: unknown,
): { ok: true; args: Record<string, never> | ComputerActionArgs | DataActionArgs | DomActionArgs } | { ok: false } {
  // BROWSER-DOM-CONTROL-V0 §13·§15: elementRef/snapshotId/구조화 조건만. selector · JS 칸은 형상에 없다.
  if (base === LOCAL_AGENT_ACTIONS.DOM_FIND) {
    const r = validateDomFindArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.DOM_READ_TEXT || base === LOCAL_AGENT_ACTIONS.DOM_CLICK) {
    const r = validateDomElementArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.DOM_SET_INPUT) {
    const r = validateDomSetInputArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.DOM_SELECT_OPTION) {
    const r = validateDomSelectOptionArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.DOM_READ_TABLE) {
    const r = validateDomReadTableArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.DATA_GET_META) {
    const r = validateDataGetMetaArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.DATA_SET_SETTING) {
    const r = validateDataSetSettingArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.COMPUTER_CLICK) {
    const r = validateClickArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT) {
    const r = validateTextArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  if (base === LOCAL_AGENT_ACTIONS.COMPUTER_KEY) {
    const r = validateKeyArgs(args);
    return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
  }
  // 그 밖의 모든 action: 빈 객체(또는 미지정)만 허용.
  if (args === undefined || args === null) return { ok: true, args: {} };
  if (typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  if (Object.keys(args as object).length !== 0) return { ok: false };
  return { ok: true, args: {} };
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
 * `2 + 6 × 등재 앱 수 + 2 × 등재 사이트 수 + 3(데이터 축)` 로 유한하며, registry 에 없는 앱은
 * 여기에 나타나지 않는다. 데이터 축 3개는 `#appId` 조합 없이 그대로 들어간다(대상=단일 local.db).
 */
export const LOCAL_AGENT_ACTION_ALLOWLIST: readonly string[] = Object.freeze([
  LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS,
  LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
  // LOCAL-DATA-TOOL-BRIDGE-V1: 데이터 축 3개(no #appId).
  ...DATA_TARGET_ACTIONS,
  ...APP_TARGET_ACTIONS.flatMap((base) =>
    WINDOWS_APP_IDS.map((appId) => composeAppAction(base, appId)),
  ),
  // BROWSER-CONTROL-V0: 등재 siteId 하나당 한 항목씩. registry 에 없는 사이트는 여기 없다.
  ...SITE_TARGET_ACTIONS.flatMap((base) =>
    BROWSER_SITE_IDS.map((siteId) => composeSiteAction(base, siteId)),
  ),
  // COMPUTER-USE-V0: 등재 appId 하나당 4항목. targetId 는 appId 뿐 — HWND · 임의 창 제목은 표현 불가.
  ...COMPUTER_TARGET_ACTIONS.flatMap((base) =>
    WINDOWS_APP_IDS.map((appId) => composeComputerAction(base, appId)),
  ),
  // BROWSER-DOM-CONTROL-V0: 등재 siteId 하나당 8항목. URL · 탭 id · selector 는 표현 불가.
  ...DOM_TARGET_ACTIONS.flatMap((base) =>
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
 * `args` 는 **자유 문자열 칸이 아니다.** Computer Use 3개 action 만 타입 고정 인자를 싣고
 * (`ComputerActionArgs`), 나머지는 전부 빈 객체다. appId 는 여전히 allowlist 로 고정된
 * `action` 문자열 안에 들어 있다(위 `composeAppAction`). DB 스키마는 바꾸지 않았다.
 *
 * `action` 이 `string` 인 것은 app 대상 action 이 `base#appId` 로 조립되기 때문이다.
 * 값의 유효성은 타입이 아니라 **`isAllowedLocalAction` + `validateLocalCommandArgs` 가
 * 판정한다**(양쪽 allowlist · 양쪽 인자 검증).
 */
export interface LocalCommand {
  commandId: string;
  action: string;
  args: Record<string, never> | ComputerActionArgs | DataActionArgs | DomActionArgs;
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

  // ── Computer Use V0 (§45) ──────────────────────────────────────────────────
  /** targetId 가 등재 앱이 아니거나, 등재 앱이 실행 중이 아니다. */
  COMPUTER_TARGET_NOT_FOUND: 'COMPUTER_USE_TARGET_NOT_FOUND',
  /** 실행 직전/직후 foreground 가 대상 창이 아니다 — 입력을 보내지 않았다(§9). */
  COMPUTER_TARGET_LOST: 'COMPUTER_USE_TARGET_LOST',
  /** 좌표가 client 영역 밖이다(§16). */
  COMPUTER_OUT_OF_BOUNDS: 'COMPUTER_USE_OUT_OF_BOUNDS',
  /** OS 입력 API 호출 자체가 실패했다. */
  COMPUTER_INPUT_FAILED: 'COMPUTER_USE_INPUT_FAILED',
  /** 로그인 창 · 파일 대화상자 · 팝업 등 사용자가 직접 처리해야 하는 화면이다(§13·§41·§42). */
  COMPUTER_USER_ACTION_REQUIRED: 'COMPUTER_USE_USER_ACTION_REQUIRED',
  /** allowlist 밖 키 · 형상 밖 인자 · 지원하지 않는 상호작용(§20·§26). */
  COMPUTER_UNSUPPORTED_ACTION: 'COMPUTER_USE_UNSUPPORTED_ACTION',

  // ── Local Data Runtime bridge (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1) ────
  /** 형상 밖 인자 · 키별 값 스키마 위반 · 범위 밖 값(§10·§11·§15). */
  DATA_INVALID_ARGUMENT: 'LOCAL_DATA_INVALID_ARGUMENT',
  /** allowlist 밖 meta/setting 키(§10·§26). 값 스키마 위반(INVALID_ARGUMENT)과 구분한다. */
  DATA_KEY_NOT_ALLOWED: 'LOCAL_DATA_KEY_NOT_ALLOWED',
  /** 로컬 SQLite 를 열거나 마이그레이션하지 못했다. */
  DATA_DB_NOT_AVAILABLE: 'LOCAL_DB_NOT_AVAILABLE',
  /** setting 쓰기가 실패했다. */
  DATA_WRITE_FAILED: 'LOCAL_DATA_WRITE_FAILED',

  // ── Browser DOM Control V0 (WO-O4O-BROWSER-DOM-CONTROL-V0 §29·§44) ─────────
  /** 현재 탭이 등재 site 가 아니다 · siteId 미등재. */
  DOM_SITE_NOT_ALLOWED: BROWSER_DOM_ERROR.SITE_NOT_ALLOWED,
  /** 등재 site 탭을 찾지 못했다(없거나 여러 개라 확정 불가). */
  DOM_TAB_NOT_FOUND: BROWSER_DOM_ERROR.TAB_NOT_FOUND,
  /** 조건에 맞는 element 가 없다 — computer_use fallback 후보 사유(§30). */
  DOM_ELEMENT_NOT_FOUND: BROWSER_DOM_ERROR.ELEMENT_NOT_FOUND,
  /** elementRef 가 현재 snapshot/page 에 더 이상 유효하지 않다(§14). */
  DOM_ELEMENT_STALE: BROWSER_DOM_ERROR.ELEMENT_STALE,
  /** 허용되지 않은 element 종류 · COMMIT 분류 click · 형상 밖 인자(§18·§22·§24). */
  DOM_ACTION_NOT_ALLOWED: BROWSER_DOM_ERROR.ACTION_NOT_ALLOWED,
  /** 등재 origin 밖으로 이동시키는 link (§25). */
  DOM_CROSS_ORIGIN_BLOCKED: BROWSER_DOM_ERROR.CROSS_ORIGIN_BLOCKED,
  /** password/OTP/PIN 필드 · 로그인 단계 — 사용자가 직접(§19·§42). */
  DOM_USER_ACTION_REQUIRED: BROWSER_DOM_ERROR.USER_ACTION_REQUIRED,
  /** content script 가 응답하지 않는다(탭 새로고침 필요 등). */
  DOM_CONTENT_UNAVAILABLE: BROWSER_DOM_ERROR.CONTENT_UNAVAILABLE,
  /** 확장에 해당 site host permission 이 없다(§44). */
  DOM_PERMISSION_REQUIRED: BROWSER_DOM_ERROR.PERMISSION_REQUIRED,
  /** 확장이 native bridge 에 붙어 있지 않다. */
  DOM_EXTENSION_NOT_CONNECTED: BROWSER_DOM_ERROR.EXTENSION_NOT_CONNECTED,
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

// ─── Safe computer info (COMPUTER-USE-V0 §10·§14·§43) ────────────────────────

/**
 * `local.computer.*` 결과가 서버에 남을 수 있는 **유일한** 필드 집합.
 *
 * 이미지는 없다. `image` · `base64` · 창 제목 · HWND · PID · 좌표 원본은 여기 없으므로
 * agent 가 실어 보내도 DB · 로그 · 프롬프트 어디에도 닿지 않는다(§12 screenshot 저장 0 ·
 * §43 window title 전문 기록 금지). snapshot 은 **크기와 시각**만 남는다.
 */
export const SAFE_COMPUTER_INFO_STRING_FIELDS: readonly string[] = Object.freeze([
  'targetId',
  'capturedAt',
  'key',
]);
export const SAFE_COMPUTER_INFO_BOOLEAN_FIELDS: readonly string[] = Object.freeze([
  'found',
  'foreground',
  'snapshotAvailable',
  'clicked',
  'typed',
  'keyPressed',
  'verified',
  'userActionRequired',
]);
export const SAFE_COMPUTER_INFO_NUMBER_FIELDS: readonly string[] = Object.freeze([
  'windowCount',
  'clientWidth',
  'clientHeight',
  'snapshotWidth',
  'snapshotHeight',
  'typedLength',
]);

/** ISO-8601 UTC 시각만. */
const CAPTURED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function pickSafeComputerInfo(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SAFE_COMPUTER_INFO_STRING_FIELDS) {
    const v = src[key];
    if (typeof v !== 'string' || v.length === 0) continue;
    if (key === 'targetId' && !WINDOWS_APP_IDS.includes(v)) continue;
    // 문자열 필드는 형식이 고정돼 있다 — 그 밖의 문자열(경로 · 제목 · 임의 키 이름)은 통과하지 않는다.
    if (key === 'capturedAt' && !CAPTURED_AT_RE.test(v)) continue;
    if (key === 'key' && !COMPUTER_ALLOWED_KEYS.includes(v)) continue;
    out[key] = v.slice(0, 60);
  }
  for (const key of SAFE_COMPUTER_INFO_BOOLEAN_FIELDS) {
    const v = src[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  for (const key of SAFE_COMPUTER_INFO_NUMBER_FIELDS) {
    const v = src[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100000) out[key] = Math.trunc(v);
  }
  return out;
}

// ─── Safe data info (LOCAL-DATA-TOOL-BRIDGE-V1 §18·§19·§20) ──────────────────

/**
 * 데이터 축 tool 이 되돌릴 수 있는 **유일한** 필드 집합.
 *
 * 금지(§19·§20): local.db **경로** · 파일 시스템 위치 · 임의 row · imported 원자료 ·
 * setting **값 원문** · credential. health 는 상태 플래그와 숫자만, get_meta 는 allowlist 된
 * 키와 그 값(짧게 잘라)만, set_setting 은 키와 저장 여부만 남는다. `value` 원문은 남기지 않는다 —
 * get_meta 값조차 60자로 자른다(meta 는 버전·시각뿐이라 길 이유가 없다).
 */
const SAFE_DATA_INFO_STRING_FIELDS: readonly string[] = Object.freeze(['key', 'value', 'migrationStatus']);
const SAFE_DATA_INFO_BOOLEAN_FIELDS: readonly string[] = Object.freeze(['ok', 'saved']);
const SAFE_DATA_INFO_NUMBER_FIELDS: readonly string[] = Object.freeze(['schemaVersion']);
const SAFE_DATA_MIGRATION_STATUS: readonly string[] = Object.freeze(['current', 'behind', 'failed']);

export function pickSafeDataInfo(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SAFE_DATA_INFO_STRING_FIELDS) {
    const v = src[key];
    if (typeof v !== 'string' || v.length === 0) continue;
    // key 는 allowlist(meta 또는 setting)에 있는 것만 통과 — agent 가 임의 키 이름을 실어도 버린다.
    if (key === 'key' && !LOCAL_DATA_META_KEYS.includes(v) && !LOCAL_DATA_SETTING_KEYS.includes(v)) continue;
    if (key === 'migrationStatus' && !SAFE_DATA_MIGRATION_STATUS.includes(v)) continue;
    out[key] = v.slice(0, 60);
  }
  for (const key of SAFE_DATA_INFO_BOOLEAN_FIELDS) {
    const v = src[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  for (const key of SAFE_DATA_INFO_NUMBER_FIELDS) {
    const v = src[key];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100000) out[key] = v;
  }
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
  if (COMPUTER_TARGET_ACTIONS.includes(base)) {
    return pickSafeComputerInfo(data);
  }
  if (DATA_TARGET_ACTIONS.includes(base)) {
    return pickSafeDataInfo(data);
  }
  if (DOM_TARGET_ACTIONS.includes(base)) {
    return pickSafeDomInfo(data);
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
