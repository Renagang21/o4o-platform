/**
 * Browser DOM Control V0 — agent 쪽 인자 · 결과 한도 사본 (순수)
 *
 * WO-O4O-BROWSER-DOM-CONTROL-V0 §13·§15·§16·§19·§20·§23·§27·§29
 *
 * 서버 `browser-dom-contract.ts` 와 **같은 규칙**을 여기서 다시 검사한다. 서버가 (버그로든 변조로든)
 * 규칙 밖 인자를 보내도 agent 가 확장으로 넘기지 않는다. 결과도 확장이 보낸 그대로가 아니라
 * **여기서 한 번 더 잘라서** cloud 로 올린다 — 전체 HTML · 긴 텍스트 · 수천 행이 실릴 자리가 없다.
 *
 * COMMIT 키워드 · 한도 · ref 형식은 서버 사본과 글자 그대로 같아야 한다(테스트가 대조).
 * 이 파일은 `chrome.*` 도 `fs` 도 `child_process` 도 쓰지 않는다.
 */

import { validateTextArgs as validateComputerTextArgs } from './computer-use-limits.mjs';

// ─── 한도 ────────────────────────────────────────────────────────────────────

export const DOM_INSPECT_MAX_ELEMENTS = 80;
export const DOM_FIND_MAX_MATCHES = 10;
export const DOM_TEXT_MAX_LENGTH = 2000;
export const DOM_INPUT_MAX_LENGTH = 500;
export const DOM_TABLE_MAX_ROWS = 50;
export const DOM_TABLE_MAX_COLUMNS = 12;
export const DOM_CELL_MAX_LENGTH = 60;
export const DOM_ELEMENT_TEXT_MAX = 120;
export const DOM_ELEMENT_NAME_MAX = 80;
export const DOM_QUERY_VALUE_MAX = 100;
export const DOM_PATH_MAX = 200;

/** 확장 응답 한 건의 직렬화 상한. 넘으면 CONTENT_UNAVAILABLE 로 잘라 낸다(§12 전체 dump 금지). */
export const DOM_RESULT_MAX_BYTES = 64 * 1024;

// ─── 식별자 ──────────────────────────────────────────────────────────────────

export const DOM_ELEMENT_REF_RE = /^e_[1-9][0-9]{0,3}$/;
export const DOM_SNAPSHOT_ID_RE = /^s_[a-z0-9]{4,32}$/;

export const DOM_FIND_QUERY_KEYS = Object.freeze(['role', 'text', 'name', 'label', 'placeholder']);
export const DOM_FIND_ROLES = Object.freeze([
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
export const DOM_ELEMENT_ROLES = Object.freeze([...DOM_FIND_ROLES, 'textarea', 'option', 'cell', 'paragraph', 'other']);

// ─── COMMIT 표식 (§23·§24) — 서버 · 확장 사본과 동일 ─────────────────────────

export const DOM_COMMIT_KEYWORDS_KO = Object.freeze([
  '결제',
  '주문확정',
  '주문하기',
  '주문완료',
  '구매',
  '결제하기',
  '삭제',
  '탈퇴',
  '게시',
  '발행',
  '송금',
  '이체',
  '승인',
  '확정',
]);
export const DOM_COMMIT_KEYWORDS_EN = Object.freeze([
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

export function classifyDomClickRisk(label) {
  const raw = String(label ?? '');
  const compact = raw.replace(/\s+/g, '');
  if (DOM_COMMIT_KEYWORDS_KO.some((k) => compact.includes(k))) return 'COMMIT';
  const lower = raw.toLowerCase();
  if (DOM_COMMIT_KEYWORDS_EN.some((k) => new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}\\b`).test(lower))) {
    return 'COMMIT';
  }
  return 'REVERSIBLE';
}

// ─── 인자 검증 ───────────────────────────────────────────────────────────────

const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function isShortText(v, max) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max && !CONTROL_CHAR_RE.test(v);
}
function exactKeys(obj, expected) {
  const keys = Object.keys(obj).sort();
  const want = [...expected].sort();
  return keys.length === want.length && keys.every((k, i) => k === want[i]);
}
export function isDomElementRef(v) {
  return typeof v === 'string' && DOM_ELEMENT_REF_RE.test(v);
}
export function isDomSnapshotId(v) {
  return typeof v === 'string' && DOM_SNAPSHOT_ID_RE.test(v);
}

export function validateDomFindQuery(query) {
  if (!isPlainObject(query)) return { ok: false };
  const keys = Object.keys(query);
  if (keys.length === 0 || keys.length > DOM_FIND_QUERY_KEYS.length) return { ok: false };
  const out = {};
  for (const key of keys) {
    if (!DOM_FIND_QUERY_KEYS.includes(key)) return { ok: false };
    const value = query[key];
    if (key === 'role') {
      if (typeof value !== 'string' || !DOM_FIND_ROLES.includes(value)) return { ok: false };
      out.role = value;
      continue;
    }
    if (!isShortText(value, DOM_QUERY_VALUE_MAX) || /[<>{}]/.test(value)) return { ok: false };
    out[key] = value;
  }
  return { ok: true, query: out };
}

export function validateDomFindArgs(args) {
  if (!isPlainObject(args) || !exactKeys(args, ['query'])) return { ok: false };
  const q = validateDomFindQuery(args.query);
  return q.ok ? { ok: true, args: { query: q.query } } : { ok: false };
}

export function validateDomElementArgs(args) {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId'])) return { ok: false };
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false };
  return { ok: true, args: { elementRef: args.elementRef, snapshotId: args.snapshotId } };
}

/** Computer Use 텍스트 규칙(credential · shell 문자열 · 제어문자 · 500자)을 그대로 쓴다(§19). */
export function validateDomSetInputArgs(args) {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId', 'text'])) return { ok: false };
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false };
  if (typeof args.text !== 'string' || args.text.length > DOM_INPUT_MAX_LENGTH) return { ok: false };
  const t = validateComputerTextArgs({ text: args.text });
  if (!t.ok) return { ok: false };
  return { ok: true, args: { elementRef: args.elementRef, snapshotId: args.snapshotId, text: args.text } };
}

export function validateDomSelectOptionArgs(args) {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId', 'option'])) return { ok: false };
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false };
  if (!isShortText(args.option, DOM_QUERY_VALUE_MAX)) return { ok: false };
  return { ok: true, args: { elementRef: args.elementRef, snapshotId: args.snapshotId, option: args.option } };
}

export function validateDomReadTableArgs(args) {
  if (args === undefined || args === null) return { ok: true, args: {} };
  if (!isPlainObject(args)) return { ok: false };
  if (Object.keys(args).length === 0) return { ok: true, args: {} };
  return validateDomElementArgs(args);
}

export function validateNoArgs(args) {
  if (args === undefined || args === null) return { ok: true, args: {} };
  if (!isPlainObject(args) || Object.keys(args).length !== 0) return { ok: false };
  return { ok: true, args: {} };
}

// ─── 결과 자르기 (§11·§12·§27) ───────────────────────────────────────────────

function clip(v, max) {
  if (typeof v !== 'string') return undefined;
  const t = v.replace(/\s+/g, ' ').trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

export function trimDomElement(raw) {
  if (!isPlainObject(raw) || !isDomElementRef(raw.elementRef)) return null;
  const out = {
    elementRef: raw.elementRef,
    role: typeof raw.role === 'string' && DOM_ELEMENT_ROLES.includes(raw.role) ? raw.role : 'other',
  };
  if (typeof raw.tag === 'string' && /^[a-z][a-z0-9-]{0,19}$/.test(raw.tag)) out.tag = raw.tag;
  const name = clip(raw.name, DOM_ELEMENT_NAME_MAX);
  if (name) out.name = name;
  const text = clip(raw.text, DOM_ELEMENT_TEXT_MAX);
  if (text) out.text = text;
  for (const k of ['disabled', 'checked', 'hasValue']) if (typeof raw[k] === 'boolean') out[k] = raw[k];
  if (typeof raw.riskLevel === 'string' && ['READ', 'REVERSIBLE', 'REVIEW_REQUIRED', 'COMMIT'].includes(raw.riskLevel)) {
    out.riskLevel = raw.riskLevel;
  }
  return out;
}

/**
 * 확장이 돌려준 결과를 cloud 로 올릴 수 있는 형상으로 자른다. 서버 `pickSafeDomInfo` 와 같은 필드만
 * 살고, 배열 길이 · 문자열 길이는 여기서 먼저 한도에 맞춘다. 모르는 필드는 버린다.
 */
export function trimDomResult(raw) {
  if (!isPlainObject(raw)) return {};
  const out = {};
  if (isDomSnapshotId(raw.snapshotId)) out.snapshotId = raw.snapshotId;
  if (isDomElementRef(raw.elementRef)) out.elementRef = raw.elementRef;
  if (typeof raw.path === 'string' && raw.path.startsWith('/') && !/[?#\s]/.test(raw.path)) {
    out.path = raw.path.slice(0, DOM_PATH_MAX);
  }
  if (typeof raw.riskLevel === 'string' && ['READ', 'REVERSIBLE', 'REVIEW_REQUIRED', 'COMMIT'].includes(raw.riskLevel)) {
    out.riskLevel = raw.riskLevel;
  }
  if (typeof raw.role === 'string' && DOM_ELEMENT_ROLES.includes(raw.role)) out.role = raw.role;
  for (const k of ['active', 'ready', 'changed', 'navigated', 'disabled', 'checked', 'hasValue', 'userActionRequired']) {
    if (typeof raw[k] === 'boolean') out[k] = raw[k];
  }
  for (const k of ['rowCount', 'elementCount', 'matchCount', 'textLength']) {
    if (Number.isInteger(raw[k]) && raw[k] >= 0) out[k] = raw[k];
  }
  const text = clip(raw.text, DOM_TEXT_MAX_LENGTH);
  if (text) out.text = text;
  if (Array.isArray(raw.elements)) {
    out.elements = raw.elements.slice(0, DOM_INSPECT_MAX_ELEMENTS).map(trimDomElement).filter(Boolean);
  }
  if (Array.isArray(raw.matches)) {
    out.matches = raw.matches.slice(0, DOM_FIND_MAX_MATCHES).map(trimDomElement).filter(Boolean);
  }
  if (Array.isArray(raw.columns)) {
    out.columns = raw.columns.slice(0, DOM_TABLE_MAX_COLUMNS).map((c) => clip(c, DOM_CELL_MAX_LENGTH) ?? '');
  }
  if (Array.isArray(raw.rows)) {
    out.rows = raw.rows
      .slice(0, DOM_TABLE_MAX_ROWS)
      .filter(Array.isArray)
      .map((r) => r.slice(0, DOM_TABLE_MAX_COLUMNS).map((c) => clip(c, DOM_CELL_MAX_LENGTH) ?? ''));
  }
  return out;
}
