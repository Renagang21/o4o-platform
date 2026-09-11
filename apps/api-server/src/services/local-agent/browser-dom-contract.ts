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
