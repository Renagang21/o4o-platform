/**
 * Browser DOM Control V0 — 인자 · 결과 · 위험 계약 (순수)
 *
 * WO-O4O-BROWSER-DOM-CONTROL-V0 §7·§8·§11·§13·§15·§16·§18·§19·§20·§23·§24·§27·§29·§38·§40
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   서버 → agent → 확장으로 흘러갈 수 있는 **DOM action 7 + context 1 의 인자 형상**과,
 *   확장 → agent → 서버로 돌아올 수 있는 **결과 필드 화이트리스트**, 그리고 click 대상의
 *   **위험 등급 분류 규칙**이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ selector 칸이 없다 (§13·§16)
 *
 *   AI · 서버 · 사용자 어느 쪽도 CSS selector · XPath · JavaScript 를 실어 보낼 수 없다.
 *   element 는 확장이 snapshot 마다 발급한 `elementRef`(`e_17`)로만 가리키고, 그 ref 는
 *   `snapshotId` 와 짝일 때만 유효하다(§14). 찾기는 `role · text · name · label · placeholder`
 *   다섯 키의 **구조화 조건**뿐이다(§15). 이 형상 밖은 서버 · agent 양쪽에서 거절된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 서버와 agent 와 확장이 **같은 규칙을 각자** 검사한다
 *
 *   `tools/o4o-local-agent/src/browser-dom-limits.mjs` 가 agent 쪽 사본, 확장 content script 가
 *   실행 직전 마지막 사본이다. COMMIT 키워드 · 한도 · 형상은 세 곳이 글자 그대로 같아야 하며
 *   테스트가 파일을 함께 읽어 대조한다.
 */

import { textDenyReason } from './computer-use-contract.js';
import type { AutomationRiskLevel } from '../ai-tools/automation-execution-contract.js';

// ─── 한도 (§11·§20·§27) ──────────────────────────────────────────────────────

/** inspect 한 번에 돌려주는 element 상한. 전체 DOM 이 아니라 "업무 판단에 필요한 최소" 다(§10·§11). */
export const DOM_INSPECT_MAX_ELEMENTS = 80;
/** find 한 번에 돌려주는 후보 상한. */
export const DOM_FIND_MAX_MATCHES = 10;
/** read_text 결과 상한(정규화된 visible text). */
export const DOM_TEXT_MAX_LENGTH = 2000;
/** set_input 입력 문자열 상한(§20). 대량 입력은 V0 범위 밖. */
export const DOM_INPUT_MAX_LENGTH = 500;
/** read_table 행 상한(§27). 수천 행을 한 번에 보내지 않는다. */
export const DOM_TABLE_MAX_ROWS = 50;
export const DOM_TABLE_MAX_COLUMNS = 12;
export const DOM_CELL_MAX_LENGTH = 60;
/** element 요약 필드 상한. */
export const DOM_ELEMENT_TEXT_MAX = 120;
export const DOM_ELEMENT_NAME_MAX = 80;
/** find 조건 문자열 상한. */
export const DOM_QUERY_VALUE_MAX = 100;
/** path 는 pathname 만(§9 query 미반환). */
export const DOM_PATH_MAX = 200;

// ─── 식별자 형식 (§13·§14) ───────────────────────────────────────────────────

/** 확장이 발급하는 element 참조. `e_` + 1~4자리 숫자. selector 가 들어갈 여지가 없는 형식이다. */
export const DOM_ELEMENT_REF_RE = /^e_[1-9][0-9]{0,3}$/;
/** snapshot 식별자. `s_` + 소문자·숫자 4~32. */
export const DOM_SNAPSHOT_ID_RE = /^s_[a-z0-9]{4,32}$/;

export function isDomElementRef(v: unknown): v is string {
  return typeof v === 'string' && DOM_ELEMENT_REF_RE.test(v);
}
export function isDomSnapshotId(v: unknown): v is string {
  return typeof v === 'string' && DOM_SNAPSHOT_ID_RE.test(v);
}

// ─── find 조건 (§15) ─────────────────────────────────────────────────────────

/** 허용 조건 키 — 정확히 이 다섯뿐. `selector` · `xpath` · `css` · `js` 는 이름이 없다(§16). */
export const DOM_FIND_QUERY_KEYS: readonly string[] = Object.freeze(['role', 'text', 'name', 'label', 'placeholder']);

/** role 은 접근성 role 의 좁은 부분집합만. */
export const DOM_FIND_ROLES: readonly string[] = Object.freeze([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'heading',
  'table',
  'tab',
  'menuitem',
  'listitem',
]);

// eslint-disable-next-line no-control-regex -- 제어문자 자체를 거르는 규칙이다
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isShortText(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max && !CONTROL_CHAR_RE.test(v);
}

export interface DomFindQuery {
  role?: string;
  text?: string;
  name?: string;
  label?: string;
  placeholder?: string;
}

/**
 * find 조건 검증. 허용 키만, 각 값은 짧은 일반 문자열, 최소 하나는 있어야 한다.
 * `<`·`>`·`{`·`}` 를 거절해 selector/스크립트 조각이 "텍스트 조건" 으로 흘러드는 것을 막는다 —
 * 페이지 텍스트를 찾는 데 그 문자는 필요 없다.
 */
export function validateDomFindQuery(query: unknown): { ok: boolean; query?: DomFindQuery } {
  if (!isPlainObject(query)) return { ok: false };
  const keys = Object.keys(query);
  if (keys.length === 0 || keys.length > DOM_FIND_QUERY_KEYS.length) return { ok: false };
  const out: DomFindQuery = {};
  for (const key of keys) {
    if (!DOM_FIND_QUERY_KEYS.includes(key)) return { ok: false };
    const value = query[key];
    if (key === 'role') {
      if (typeof value !== 'string' || !DOM_FIND_ROLES.includes(value)) return { ok: false };
      out.role = value;
      continue;
    }
    if (!isShortText(value, DOM_QUERY_VALUE_MAX) || /[<>{}]/.test(value)) return { ok: false };
    (out as Record<string, string>)[key] = value;
  }
  return { ok: true, query: out };
}

// ─── action 인자 형상 (§9·§15·§17·§18·§21·§22·§26) ──────────────────────────

export interface DomFindArgs {
  query: DomFindQuery;
}
export interface DomElementArgs {
  elementRef: string;
  snapshotId: string;
}
export interface DomSetInputArgs extends DomElementArgs {
  text: string;
}
export interface DomSelectOptionArgs extends DomElementArgs {
  option: string;
}
/** read_table 은 ref 가 없으면 "첫 table" 이다. */
export type DomReadTableArgs = Record<string, never> | DomElementArgs;

export type DomActionArgs = DomFindArgs | DomElementArgs | DomSetInputArgs | DomSelectOptionArgs | DomReadTableArgs;

function exactKeys(obj: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(obj).sort();
  const want = [...expected].sort();
  return keys.length === want.length && keys.every((k, i) => k === want[i]);
}

/** `{ query }` 하나. */
export function validateDomFindArgs(args: unknown): { ok: boolean; args?: DomFindArgs } {
  if (!isPlainObject(args) || !exactKeys(args, ['query'])) return { ok: false };
  const q = validateDomFindQuery(args.query);
  return q.ok && q.query ? { ok: true, args: { query: q.query } } : { ok: false };
}

/** `{ elementRef, snapshotId }` 정확히 둘. */
export function validateDomElementArgs(args: unknown): { ok: boolean; args?: DomElementArgs } {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId'])) return { ok: false };
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false };
  return { ok: true, args: { elementRef: args.elementRef, snapshotId: args.snapshotId } };
}

export type DomInputDenyReason = 'EMPTY' | 'TOO_LONG' | 'CONTROL_CHAR' | 'DENIED_CONTENT';

/**
 * set_input 텍스트 검사. Computer Use 의 `textDenyReason` 과 **같은 규칙**을 쓴다 — 비밀번호 ·
 * 인증번호 · 명령어 성격의 문자열은 어느 입력 경로로도 들어가지 않는다(§19 마지막 안전망).
 * 상한은 DOM_INPUT_MAX_LENGTH(500) 로 같다.
 */
export function domInputDenyReason(text: string): DomInputDenyReason | null {
  if (text.length > DOM_INPUT_MAX_LENGTH) return 'TOO_LONG';
  return textDenyReason(text);
}

/** `{ elementRef, snapshotId, text }`. */
export function validateDomSetInputArgs(
  args: unknown,
): { ok: boolean; args?: DomSetInputArgs; reason?: DomInputDenyReason | 'SHAPE' } {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId', 'text'])) {
    return { ok: false, reason: 'SHAPE' };
  }
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false, reason: 'SHAPE' };
  if (typeof args.text !== 'string') return { ok: false, reason: 'SHAPE' };
  const reason = domInputDenyReason(args.text);
  if (reason) return { ok: false, reason };
  return { ok: true, args: { elementRef: args.elementRef, snapshotId: args.snapshotId, text: args.text } };
}

/** `{ elementRef, snapshotId, option }` — option 은 native select 의 label 또는 value 문자열. */
export function validateDomSelectOptionArgs(args: unknown): { ok: boolean; args?: DomSelectOptionArgs } {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId', 'option'])) return { ok: false };
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false };
  if (!isShortText(args.option, DOM_QUERY_VALUE_MAX)) return { ok: false };
  return { ok: true, args: { elementRef: args.elementRef, snapshotId: args.snapshotId, option: args.option } };
}

/** `{}` 또는 `{ elementRef, snapshotId }`. */
export function validateDomReadTableArgs(args: unknown): { ok: boolean; args?: DomReadTableArgs } {
  if (args === undefined || args === null) return { ok: true, args: {} };
  if (!isPlainObject(args)) return { ok: false };
  if (Object.keys(args).length === 0) return { ok: true, args: {} };
  const r = validateDomElementArgs(args);
  return r.ok && r.args ? { ok: true, args: r.args } : { ok: false };
}

// ─── 위험 등급 (§23·§24·§40) ─────────────────────────────────────────────────

/**
 * click 대상의 접근 가능 이름 · 텍스트에 아래 표식이 있으면 COMMIT 으로 본다(§23).
 * COMMIT 은 V0 에서 **자동 실행 금지**(§24) — 사용자가 직접 누른다.
 *
 * 한글 표식은 문자열 리터럴로 둔다(정규식 리터럴이 아니므로 esbuild ascii charset 함정에 걸리지 않는다).
 * 확장 content-script.js · agent browser-dom-limits.mjs 에 **같은 목록**이 있다(테스트 대조).
 */
export const DOM_COMMIT_KEYWORDS_KO: readonly string[] = Object.freeze([
  '결제', // 결제
  '주문확정', // 주문확정
  '주문하기', // 주문하기
  '주문완료', // 주문완료
  '구매', // 구매
  '결제하기', // 결제하기
  '삭제', // 삭제
  '탈퇴', // 탈퇴
  '게시', // 게시
  '발행', // 발행
  '송금', // 송금
  '이체', // 이체
  '승인', // 승인
  '확정', // 확정
]);
export const DOM_COMMIT_KEYWORDS_EN: readonly string[] = Object.freeze([
  'pay',
  'payment',
  'checkout',
  'place order',
  'purchase',
  'buy now',
  'delete',
  'remove account',
  'publish',
  'confirm order',
  'submit order',
  'transfer',
  'approve',
]);

/**
 * click 위험 등급. name/text 를 공백 제거 후 한글 표식 포함 여부, 영문은 단어 경계로 본다.
 * 표식이 없으면 REVERSIBLE — "검색 · 필터 · 장바구니 추가" 는 되돌릴 수 있다(§23).
 */
export function classifyDomClickRisk(label: string): AutomationRiskLevel {
  const raw = String(label ?? '');
  const compact = raw.replace(/\s+/g, '');
  if (DOM_COMMIT_KEYWORDS_KO.some((k) => compact.includes(k))) return 'COMMIT';
  const lower = raw.toLowerCase();
  if (DOM_COMMIT_KEYWORDS_EN.some((k) => new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}\\b`).test(lower))) {
    return 'COMMIT';
  }
  return 'REVERSIBLE';
}

// ─── 오류 코드 (§29·§44) ─────────────────────────────────────────────────────

export const BROWSER_DOM_ERROR = Object.freeze({
  SITE_NOT_ALLOWED: 'DOM_SITE_NOT_ALLOWED',
  TAB_NOT_FOUND: 'DOM_TAB_NOT_FOUND',
  ELEMENT_NOT_FOUND: 'DOM_ELEMENT_NOT_FOUND',
  ELEMENT_STALE: 'DOM_ELEMENT_STALE',
  ACTION_NOT_ALLOWED: 'DOM_ACTION_NOT_ALLOWED',
  CROSS_ORIGIN_BLOCKED: 'DOM_CROSS_ORIGIN_BLOCKED',
  USER_ACTION_REQUIRED: 'DOM_USER_ACTION_REQUIRED',
  CONTENT_UNAVAILABLE: 'DOM_CONTENT_UNAVAILABLE',
  PERMISSION_REQUIRED: 'BROWSER_DOM_PERMISSION_REQUIRED',
  /** 확장이 native bridge 에 붙어 있지 않다(agent 는 살아 있어도). */
  EXTENSION_NOT_CONNECTED: 'O4O_EXTENSION_NOT_CONNECTED',
} as const);

export type BrowserDomErrorCode = (typeof BROWSER_DOM_ERROR)[keyof typeof BROWSER_DOM_ERROR];

// ─── 결과 화이트리스트 (§9·§11·§12·§17·§26·§32·§51) ─────────────────────────

/** element 요약에 허용된 role 값. 그 밖은 'other'. */
export const DOM_ELEMENT_ROLES: readonly string[] = Object.freeze([
  ...DOM_FIND_ROLES,
  'textarea',
  'option',
  'cell',
  'paragraph',
  'other',
]);
const DOM_TAG_RE = /^[a-z][a-z0-9-]{0,19}$/;
const SAFE_RISK: readonly string[] = Object.freeze(['READ', 'REVERSIBLE', 'REVIEW_REQUIRED', 'COMMIT']);

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.replace(/\s+/g, ' ').trim();
  if (t.length === 0) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

export interface SafeDomElement {
  elementRef: string;
  role: string;
  tag?: string;
  name?: string;
  text?: string;
  disabled?: boolean;
  checked?: boolean;
  hasValue?: boolean;
  riskLevel?: AutomationRiskLevel;
}

/**
 * element 요약 한 건. ref · role · tag · 짧은 name/text · 상태 플래그뿐이다.
 * value 는 "있는가" 만(§11 value presence) — 값 자체는 통과하지 않는다(비밀번호·토큰 새는 길).
 * id · class · selector · outerHTML · href · src 는 필드가 없다.
 */
export function pickSafeDomElement(raw: unknown): SafeDomElement | null {
  if (!isPlainObject(raw)) return null;
  if (!isDomElementRef(raw.elementRef)) return null;
  const role = typeof raw.role === 'string' && DOM_ELEMENT_ROLES.includes(raw.role) ? raw.role : 'other';
  const out: SafeDomElement = { elementRef: raw.elementRef, role };
  if (typeof raw.tag === 'string' && DOM_TAG_RE.test(raw.tag)) out.tag = raw.tag;
  const name = clip(raw.name, DOM_ELEMENT_NAME_MAX);
  if (name) out.name = name;
  const text = clip(raw.text, DOM_ELEMENT_TEXT_MAX);
  if (text) out.text = text;
  if (typeof raw.disabled === 'boolean') out.disabled = raw.disabled;
  if (typeof raw.checked === 'boolean') out.checked = raw.checked;
  if (typeof raw.hasValue === 'boolean') out.hasValue = raw.hasValue;
  if (typeof raw.riskLevel === 'string' && SAFE_RISK.includes(raw.riskLevel)) {
    out.riskLevel = raw.riskLevel as AutomationRiskLevel;
  }
  return out;
}

function pickElements(raw: unknown, max: number): SafeDomElement[] {
  if (!Array.isArray(raw)) return [];
  const out: SafeDomElement[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    const e = pickSafeDomElement(item);
    if (e) out.push(e);
  }
  return out;
}

function pickStringRow(raw: unknown, maxCols: number, maxLen: number): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, maxCols).map((c) => clip(c, maxLen) ?? '');
}

/** 페이지에서 읽은 것임을 표시하는 출처 태그(§32·§34). 명령 권한이 없다. */
export const DOM_CONTENT_SOURCE = 'webpage' as const;

/**
 * `local.browser.dom.*` 결과가 서버에 남을 수 있는 **유일한** 필드 집합.
 *
 * 전체 HTML · 전체 텍스트 · URL query · 쿠키 · 토큰 · 폼 값은 여기에 이름이 없으므로 통과하지
 * 못한다(§12·§43·§51). 텍스트를 담는 결과에는 `source: 'webpage'` 를 **항상** 붙인다(§32).
 */
export function pickSafeDomInfo(data: unknown): Record<string, unknown> {
  if (!isPlainObject(data)) return {};
  const out: Record<string, unknown> = {};

  for (const key of ['siteId', 'displayName']) {
    const v = clip(data[key], 64);
    if (v) out[key] = v;
  }
  if (isDomSnapshotId(data.snapshotId)) out.snapshotId = data.snapshotId;
  if (isDomElementRef(data.elementRef)) out.elementRef = data.elementRef;
  if (typeof data.path === 'string' && data.path.startsWith('/') && !/[?#\s]/.test(data.path)) {
    out.path = data.path.slice(0, DOM_PATH_MAX);
  }
  // 문서 인스턴스 id(무작위) — 이동 뒤 새 문서인지 판정하는 데만 쓴다. 페이지 내용과 무관하다.
  if (typeof data.docId === 'string' && /^d_[a-z0-9]{4,32}$/.test(data.docId)) out.docId = data.docId;
  if (typeof data.errorCode === 'string' && /^[A-Z0-9_]{1,64}$/.test(data.errorCode)) out.errorCode = data.errorCode;
  if (typeof data.riskLevel === 'string' && SAFE_RISK.includes(data.riskLevel)) out.riskLevel = data.riskLevel;
  if (typeof data.role === 'string' && DOM_ELEMENT_ROLES.includes(data.role)) out.role = data.role;

  for (const key of ['active', 'ready', 'changed', 'navigated', 'disabled', 'checked', 'hasValue', 'userActionRequired', 'extensionConnected']) {
    if (typeof data[key] === 'boolean') out[key] = data[key];
  }
  for (const key of ['rowCount', 'elementCount', 'matchCount', 'textLength']) {
    const v = data[key];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1_000_000) out[key] = v;
  }

  const text = clip(data.text, DOM_TEXT_MAX_LENGTH);
  if (text) {
    out.text = text;
    out.source = DOM_CONTENT_SOURCE;
  }
  if (Array.isArray(data.elements)) {
    out.elements = pickElements(data.elements, DOM_INSPECT_MAX_ELEMENTS);
    out.source = DOM_CONTENT_SOURCE;
  }
  if (Array.isArray(data.matches)) {
    out.matches = pickElements(data.matches, DOM_FIND_MAX_MATCHES);
    out.source = DOM_CONTENT_SOURCE;
  }
  if (Array.isArray(data.columns)) {
    out.columns = pickStringRow(data.columns, DOM_TABLE_MAX_COLUMNS, DOM_CELL_MAX_LENGTH) ?? [];
    out.source = DOM_CONTENT_SOURCE;
  }
  if (Array.isArray(data.rows)) {
    const rows: string[][] = [];
    for (const r of data.rows) {
      if (rows.length >= DOM_TABLE_MAX_ROWS) break;
      const row = pickStringRow(r, DOM_TABLE_MAX_COLUMNS, DOM_CELL_MAX_LENGTH);
      if (row) rows.push(row);
    }
    out.rows = rows;
    out.source = DOM_CONTENT_SOURCE;
  }
  return out;
}

// ─── 작업 단위 실행 (WO-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1) ────────
//
// `local.browser.dom.run_unit#siteId` — Assistant 가 **이미 판단을 마친 행동 묶음**을 한 번에 Execution Node 로 보낸다.
// Node(agent)는 local bridge 로 단계를 이어 실행하고, 판단이 새로 필요한 자리(실패 · 화면 변화 뒤 옛 ref · 대상 없음 ·
// 모호 · COMMIT · 자격 · 다른 사이트 · 예상 불일치 · 예산 · 시간)에서 **멈춰** 결과와 최종 관찰을 돌려준다.
//
//   - 새 능력이 아니라 기존 DOM action(click · set_input · select_option · find · get_context · inspect)의 **연속 실행**이다.
//     확장 content script 는 단계마다 지금과 같은 검사(COMMIT · 자격 · 형상)를 그대로 한다.
//   - Task 의 목적 · 순서를 Node 가 바꾸지 않는다 — 단계는 서버가 정한 그대로, 앞에서부터, 건너뛰지 않는다.
//   - 단계 형상은 둘뿐이다(한 단위 안에서 섞지 않는다).
//       act       현재 snapshot 의 elementRef 로 행동(Fast Loop 배치 — 서버가 validateWorkProposal 로 이미 검증)
//       find_act  구조화 조건으로 찾아 **유일할 때만** 행동(Workflow Candidate 재생 — pickReplayTarget 규칙)
//   - agent 사본: `tools/o4o-local-agent/src/browser-dom-limits.mjs`(상수 · 원인 목록이 같다 — 테스트 대조).

/** 한 단위에 담는 단계 상한. 재생 단계 · Fast Loop 배치(WORK_BATCH_MAX 4) 모두 이 안이다. */
export const DOM_UNIT_MAX_STEPS = 12;
/** 한 단위가 쓸 수 있는 유효 명령(행동 · 찾기 · 관찰) 상한. 서버는 남은 loop 예산 이하로 보낸다. */
export const DOM_UNIT_MAX_COMMANDS = 60;
/** 한 단위의 실행 시간 상한(ms). Node 는 이것과 명령 만료 중 이른 쪽에서 멈춘다. */
export const DOM_UNIT_MAX_DURATION_MS = 30000;
/** 단위 명령 TTL(ms) — 발행 → claim → 실행 → 결과 제출. 단발 명령(20 s)보다 길다(실행 상한 + 여유). */
export const DOM_UNIT_COMMAND_TTL_MS = 45000;
/** 일반 / 이동 뒤 관찰의 재시도 횟수와 간격 — 서버 observe() 와 같은 값. */
export const DOM_UNIT_OBSERVE_ATTEMPTS = 3;
export const DOM_UNIT_OBSERVE_ATTEMPTS_AFTER_NAVIGATION = 10;
export const DOM_UNIT_SETTLE_MS = 700;

export const DOM_UNIT_OPS: readonly string[] = Object.freeze(['act', 'find_act']);
export const DOM_UNIT_ACT_KINDS: readonly string[] = Object.freeze(['click', 'set_input', 'select_option']);
/** find_act 가 고른 요소의 role 이 행동과 맞아야 한다(work-agent-contract 의 CLICK/INPUT/SELECT_ROLES 와 같다). */
export const DOM_UNIT_KIND_ROLES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  click: Object.freeze(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem']),
  set_input: Object.freeze(['textbox', 'searchbox', 'textarea']),
  select_option: Object.freeze(['combobox']),
});
/**
 * Node 가 멈춘 이유. 어느 것이든 "여기서부터는 Assistant 가 판단한다" 는 뜻이다.
 *   step_failed          행동이 실패했다(오류 코드 동반 — 자격 · COMMIT · 다른 사이트 포함)
 *   reobserve            화면이 바뀌어 남은 ref 단계가 더는 유효하지 않다
 *   find_failed          찾기 자체가 실패했다
 *   locator_not_found    유일한 대상이 없다(없음 · 모호)
 *   validation_rejected  고른 대상이 행동과 맞지 않는다(role · disabled · COMMIT)
 *   expect_mismatch      저장 때 이동했던 단계가 이번엔 이동하지 않았다
 *   cross_origin         다른 사이트로 넘어갔다
 *   not_ready            화면이 준비되지 않았다(재시도 소진)
 *   budget · time        예산 · 시간 상한
 */
export const DOM_UNIT_STOP_CAUSES: readonly string[] = Object.freeze([
  'step_failed',
  'reobserve',
  'find_failed',
  'locator_not_found',
  'validation_rejected',
  'expect_mismatch',
  'cross_origin',
  'not_ready',
  'budget',
  'time',
]);
export const DOM_DOC_ID_RE = /^d_[a-z0-9]{4,32}$/;

export type DomUnitActKind = 'click' | 'set_input' | 'select_option';
export interface DomUnitActStep {
  op: 'act';
  kind: DomUnitActKind;
  elementRef: string;
  snapshotId: string;
  text?: string;
  option?: string;
}
export interface DomUnitFindActStep {
  op: 'find_act';
  kind: DomUnitActKind;
  query: DomFindQuery;
  expectNavigated: boolean;
  text?: string;
  option?: string;
}
export type DomUnitStep = DomUnitActStep | DomUnitFindActStep;
export interface DomRunUnitArgs {
  steps: DomUnitStep[];
  /** 단계 뒤(또는 멈춘 자리에서) get_context + inspect 관찰을 함께 돌려줄 것인가. */
  observe: boolean;
  maxCommands: number;
  maxDurationMs: number;
  /** 단위 시작 시점 문서 id — 이동 뒤 옛 문서를 새 관찰로 받아들이지 않기 위해서만 쓴다. */
  docId?: string;
  /** 단계 없이 관찰만 할 때, 직전 행동이 이동했는가(서버 observe({afterNavigation}) 와 같다). */
  afterNavigation?: boolean;
}

/** set_input 값 — 단발 경로(validateSingleAction)와 같은 규칙: 비어 있지 않음 · 입력 거절 규칙 · HTML 문자 없음. */
export function isDomUnitText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && domInputDenyReason(v) === null && !/[<>{}]/.test(v);
}

/** 단계 하나. 키 집합이 정확해야 하고, 값은 단발 action 과 같은 규칙을 지난다. */
function validateDomUnitStep(raw: unknown): DomUnitStep | null {
  if (!isPlainObject(raw)) return null;
  const kind = raw.kind;
  if (typeof kind !== 'string' || !DOM_UNIT_ACT_KINDS.includes(kind)) return null;
  const valueKey = kind === 'set_input' ? 'text' : kind === 'select_option' ? 'option' : null;
  const value = valueKey ? raw[valueKey] : undefined;
  if (valueKey === 'text' && !isDomUnitText(value)) return null;
  if (valueKey === 'option' && !isShortText(value, DOM_QUERY_VALUE_MAX)) return null;
  const extra: Record<string, unknown> = valueKey ? { [valueKey]: value } : {};
  if (raw.op === 'act') {
    if (!exactKeys(raw, ['op', 'kind', 'elementRef', 'snapshotId', ...(valueKey ? [valueKey] : [])])) return null;
    if (!isDomElementRef(raw.elementRef) || !isDomSnapshotId(raw.snapshotId)) return null;
    return { op: 'act', kind: kind as DomUnitActKind, elementRef: raw.elementRef, snapshotId: raw.snapshotId, ...extra };
  }
  if (raw.op === 'find_act') {
    if (!exactKeys(raw, ['op', 'kind', 'query', 'expectNavigated', ...(valueKey ? [valueKey] : [])])) return null;
    if (typeof raw.expectNavigated !== 'boolean') return null;
    const q = validateDomFindQuery(raw.query);
    if (!q.ok || !q.query) return null;
    return { op: 'find_act', kind: kind as DomUnitActKind, query: q.query, expectNavigated: raw.expectNavigated, ...extra };
  }
  return null;
}

/**
 * `run_unit` 인자. 단계 0~12(0 이면 관찰 전용 — observe 필수), 한 단위 안에서 op 를 섞지 않는다,
 * 예산 · 시간은 상한 안의 정수. 형상 밖이면 **단계 하나도 실행되지 않는다**(agent 도 같은 검사를 먼저 한다).
 */
export function validateDomRunUnitArgs(args: unknown): { ok: boolean; args?: DomRunUnitArgs } {
  if (!isPlainObject(args)) return { ok: false };
  const allowed = ['steps', 'observe', 'maxCommands', 'maxDurationMs', 'docId', 'afterNavigation'];
  if (Object.keys(args).some((k) => !allowed.includes(k))) return { ok: false };
  if (!Array.isArray(args.steps) || args.steps.length > DOM_UNIT_MAX_STEPS) return { ok: false };
  if (typeof args.observe !== 'boolean') return { ok: false };
  if (args.steps.length === 0 && args.observe !== true) return { ok: false };
  const intIn = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
  if (!intIn(args.maxCommands, 1, DOM_UNIT_MAX_COMMANDS)) return { ok: false };
  if (!intIn(args.maxDurationMs, 1000, DOM_UNIT_MAX_DURATION_MS)) return { ok: false };
  if (args.docId !== undefined && !(typeof args.docId === 'string' && DOM_DOC_ID_RE.test(args.docId))) return { ok: false };
  if (args.afterNavigation !== undefined && typeof args.afterNavigation !== 'boolean') return { ok: false };
  const steps: DomUnitStep[] = [];
  for (const raw of args.steps) {
    const s = validateDomUnitStep(raw);
    if (!s) return { ok: false };
    steps.push(s);
  }
  if (new Set(steps.map((s) => s.op)).size > 1) return { ok: false };
  const out: DomRunUnitArgs = { steps, observe: args.observe, maxCommands: args.maxCommands as number, maxDurationMs: args.maxDurationMs as number };
  if (typeof args.docId === 'string') out.docId = args.docId;
  if (typeof args.afterNavigation === 'boolean') out.afterNavigation = args.afterNavigation;
  return { ok: true, args: out };
}

const UNIT_REPORT_STATUSES: readonly string[] = Object.freeze(['success', 'failed', 'denied']);
const SAFE_CODE_RE = /^[A-Z0-9_]{1,64}$/;

function safeSmallInt(v: unknown, hi: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= hi;
}

/**
 * `run_unit` 결과 화이트리스트. 단계별 보고(번호 · 종류 · 상태 · 오류 코드 · 이동/변경 · 위험 등급 · 고른 요소 요약),
 * 멈춘 이유, 명령 수 · 시간, 그리고 최종 관찰(pickSafeDomInfo 와 같은 element 요약)뿐이다.
 * **입력한 텍스트 · 선택값 · 찾기 조건은 되돌아오지 않는다** — 서버가 이미 알고 있고, 결과에 실릴 자리가 없다.
 */
export function pickSafeDomUnitInfo(data: unknown): Record<string, unknown> {
  if (!isPlainObject(data)) return {};
  const out: Record<string, unknown> = {};
  for (const key of ['siteId', 'displayName']) {
    const v = clip(data[key], 64);
    if (v) out[key] = v;
  }
  if (typeof data.errorCode === 'string' && SAFE_CODE_RE.test(data.errorCode)) out.errorCode = data.errorCode;
  for (const key of ['commandCount', 'probeCount']) if (safeSmallInt(data[key], 1000)) out[key] = data[key];
  if (safeSmallInt(data.durationMs, 600000)) out.durationMs = data.durationMs;

  const reports: Record<string, unknown>[] = [];
  if (Array.isArray(data.reports)) {
    for (const r of data.reports) {
      if (reports.length >= DOM_UNIT_MAX_STEPS) break;
      if (!isPlainObject(r)) continue;
      if (!safeSmallInt(r.index, DOM_UNIT_MAX_STEPS - 1)) continue;
      if (typeof r.status !== 'string' || !UNIT_REPORT_STATUSES.includes(r.status)) continue;
      const rep: Record<string, unknown> = { index: r.index, status: r.status };
      if (typeof r.op === 'string' && DOM_UNIT_OPS.includes(r.op)) rep.op = r.op;
      if (typeof r.kind === 'string' && DOM_UNIT_ACT_KINDS.includes(r.kind)) rep.kind = r.kind;
      if (typeof r.errorCode === 'string' && SAFE_CODE_RE.test(r.errorCode)) rep.errorCode = r.errorCode;
      for (const key of ['navigated', 'changed']) if (typeof r[key] === 'boolean') rep[key] = r[key];
      if (typeof r.riskLevel === 'string' && SAFE_RISK.includes(r.riskLevel)) rep.riskLevel = r.riskLevel;
      const target = r.target === undefined ? null : pickSafeDomElement(r.target);
      if (target) rep.target = target;
      reports.push(rep);
    }
  }
  out.reports = reports;

  out.stop = null;
  if (isPlainObject(data.stop) && typeof data.stop.cause === 'string' && DOM_UNIT_STOP_CAUSES.includes(data.stop.cause)) {
    const stop: Record<string, unknown> = { cause: data.stop.cause };
    if (safeSmallInt(data.stop.stepIndex, DOM_UNIT_MAX_STEPS)) stop.stepIndex = data.stop.stepIndex;
    if (typeof data.stop.errorCode === 'string' && SAFE_CODE_RE.test(data.stop.errorCode)) stop.errorCode = data.stop.errorCode;
    out.stop = stop;
  }

  if (isPlainObject(data.observation)) {
    const o = pickSafeDomInfo(data.observation);
    const obs: Record<string, unknown> = {};
    for (const key of ['siteId', 'path', 'docId', 'snapshotId', 'ready', 'elementCount', 'elements', 'source']) {
      if (o[key] !== undefined) obs[key] = o[key];
    }
    out.observation = obs;
    out.source = DOM_CONTENT_SOURCE;
  }
  if (typeof data.observeErrorCode === 'string' && SAFE_CODE_RE.test(data.observeErrorCode)) out.observeErrorCode = data.observeErrorCode;
  return out;
}
