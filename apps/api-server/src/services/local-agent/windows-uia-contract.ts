/**
 * Windows UI Automation V0 — 서버 계약 (WO-O4O-WINDOWS-UI-AUTOMATION-V0)
 *
 *   `local.uia.inspect|set_value|invoke|key|click#<appId>` — 등재 앱 창의 UIA 트리 읽기 · 요소 값 입력 · 기본 동작 · 키 1회 · 창 안 좌표 클릭.
 *
 *   DOM 축과 같은 형상이다: 요소는 `e_n` + `snapshotId` 로만 가리키고(HWND · RuntimeId · 창 제목 원문은 agent 메모리에만), 텍스트 · 키 ·
 *   좌표는 computer-use 계약의 규칙(길이 · 제어문자 · credential 성격 금지 · 허용 키 · 0..1 좌표)을 지난다. 결과 whitelist(`pickSafeUiaInfo`)는
 *   role enum · 짧은 name/text · 플래그 · 크기 · 창 제목(60자, UI 라벨 — UNTRUSTED) 만 통과시킨다. 실행 경로 · pid · 핸들은 없다.
 */

import { textDenyReason } from './computer-use-contract.js';
import { isDomElementRef, isDomSnapshotId, validateDomElementArgs, validateDomSetInputArgs, type DomElementArgs } from './browser-dom-contract.js';
import type { AutomationRiskLevel } from '../ai-tools/automation-execution-contract.js';

export const UIA_ROLES: readonly string[] = Object.freeze(['window', 'pane', 'textbox', 'document', 'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'listitem', 'list', 'combobox', 'text', 'image', 'custom']);
/** UIA 키 = computer-use 셋 + CTRL+ENTER(여러 줄 입력창 제출 관례 — 카카오톡 "Ctrl+Enter 로 전송" 실측). 그 밖 수식키 조합은 없다. */
export const UIA_ALLOWED_KEYS: readonly string[] = Object.freeze(['ENTER', 'TAB', 'ESC', 'CTRL+ENTER']);
/** 좌표 클릭을 받을 수 있는 role — UIA 가 항목을 노출하지 않는 커스텀 목록/창의 fallback. */
export const UIA_POINTER_ROLES: readonly string[] = Object.freeze(['window', 'pane', 'list', 'listitem', 'custom', 'image', 'document', 'text']);
export const UIA_MAX_ELEMENTS = 150;
const NAME_MAX = 80;
const TITLE_MAX = 60;
const SAFE_RISK: readonly string[] = Object.freeze(['READ', 'REVERSIBLE', 'REVIEW_REQUIRED', 'COMMIT']);
const WINDOW_REF_RE = /^w_[1-9][0-9]{0,2}$/;
/** agent 안전층 판정 사유(enum). 창 제목 · 좌표 · 키 내용은 사유가 아니다. */
export const SAFE_SAFETY_REASONS: readonly string[] = Object.freeze([
  'user_active', 'probe_failed', 'target_window_gone', 'unexpected_window', 'title_changed', 'element_stale', 'other_window_same_process', 'other_app_foreground',
  'blind_list_click', 'key_semantics_unknown', 'risky_key', 'submit_element_unverified', 'submit_title_unverified', 'ok', 'user_idle_after_pause',
]);

export interface UiaKeyArgs { key: string; snapshotId: string; elementRef?: string }
export interface UiaClickArgs { elementRef: string; snapshotId: string; x: number; y: number; clicks?: 1 | 2 }
export type UiaActionArgs = DomElementArgs | { elementRef: string; snapshotId: string; text: string } | UiaKeyArgs | UiaClickArgs;

const isPlain = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCoord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

/** `{ elementRef, snapshotId, text }` — DOM set_input 과 같은 형상 + computer-use 텍스트 규칙. */
export function validateUiaSetValueArgs(args: unknown): { ok: boolean; args?: { elementRef: string; snapshotId: string; text: string } } {
  const r = validateDomSetInputArgs(args);
  if (!r.ok || !r.args) return { ok: false };
  if (textDenyReason(r.args.text) !== null) return { ok: false };
  return { ok: true, args: r.args };
}

export function validateUiaInvokeArgs(args: unknown): { ok: boolean; args?: DomElementArgs } {
  return validateDomElementArgs(args);
}

/** `{ key, snapshotId, elementRef? }` */
export function validateUiaKeyArgs(args: unknown): { ok: boolean; args?: UiaKeyArgs } {
  if (!isPlain(args)) return { ok: false };
  const keys = Object.keys(args).sort().join(',');
  if (keys !== 'key,snapshotId' && keys !== 'elementRef,key,snapshotId') return { ok: false };
  if (typeof args.key !== 'string' || !UIA_ALLOWED_KEYS.includes(args.key)) return { ok: false };
  if (!isDomSnapshotId(args.snapshotId)) return { ok: false };
  const out: UiaKeyArgs = { key: args.key, snapshotId: args.snapshotId };
  if (args.elementRef !== undefined) {
    if (!isDomElementRef(args.elementRef)) return { ok: false };
    out.elementRef = args.elementRef;
  }
  return { ok: true, args: out };
}

/** `{ elementRef, snapshotId, x, y, clicks? }` — 좌표는 요소 rect 안 0..1, clicks 는 1|2. */
export function validateUiaClickArgs(args: unknown): { ok: boolean; args?: UiaClickArgs } {
  if (!isPlain(args)) return { ok: false };
  const keys = Object.keys(args).sort().join(',');
  if (keys !== 'elementRef,snapshotId,x,y' && keys !== 'clicks,elementRef,snapshotId,x,y') return { ok: false };
  if (!isDomElementRef(args.elementRef) || !isDomSnapshotId(args.snapshotId)) return { ok: false };
  if (!isCoord(args.x) || !isCoord(args.y)) return { ok: false };
  const out: UiaClickArgs = { elementRef: args.elementRef, snapshotId: args.snapshotId, x: args.x, y: args.y };
  if (args.clicks !== undefined) {
    if (args.clicks !== 1 && args.clicks !== 2) return { ok: false };
    out.clicks = args.clicks;
  }
  return { ok: true, args: out };
}

export interface SafeUiaElement {
  elementRef: string;
  role: string;
  /** 어느 창의 요소인가(w_n). 같은 앱이 창을 여럿 띄울 때(메인 + 대화창) Planner 가 창을 구분한다. */
  windowRef?: string;
  name?: string;
  text?: string;
  hasValue?: boolean;
  editable?: boolean;
  disabled?: boolean;
  focused?: boolean;
  offscreen?: boolean;
  userAction?: boolean;
  size?: [number, number];
  riskLevel?: AutomationRiskLevel;
}

export interface SafeUiaWindow { windowRef: string; title: string; foreground: boolean; minimized: boolean; userAction: boolean }

const clip = (v: unknown, n: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.replace(/[\r\n\t]+/g, ' ').trim();
  return t.length ? t.slice(0, n) : undefined;
};

export function pickSafeUiaElement(raw: unknown): SafeUiaElement | null {
  if (!isPlain(raw) || !isDomElementRef(raw.elementRef)) return null;
  const role = typeof raw.role === 'string' && UIA_ROLES.includes(raw.role) ? raw.role : 'custom';
  const out: SafeUiaElement = { elementRef: raw.elementRef, role };
  if (typeof raw.windowRef === 'string' && WINDOW_REF_RE.test(raw.windowRef)) out.windowRef = raw.windowRef;
  const name = clip(raw.name, NAME_MAX);
  if (name) out.name = name;
  const text = clip(raw.text, NAME_MAX);
  if (text) out.text = text;
  for (const k of ['hasValue', 'editable', 'disabled', 'focused', 'offscreen', 'userAction'] as const) {
    if (typeof raw[k] === 'boolean') out[k] = raw[k] as boolean;
  }
  if (Array.isArray(raw.size) && raw.size.length === 2 && raw.size.every((v) => Number.isInteger(v) && v >= 0 && v <= 20000)) out.size = [raw.size[0], raw.size[1]];
  if (typeof raw.riskLevel === 'string' && SAFE_RISK.includes(raw.riskLevel)) out.riskLevel = raw.riskLevel as AutomationRiskLevel;
  return out;
}

export function pickSafeUiaWindow(raw: unknown): SafeUiaWindow | null {
  if (!isPlain(raw) || typeof raw.windowRef !== 'string' || !WINDOW_REF_RE.test(raw.windowRef)) return null;
  return { windowRef: raw.windowRef, title: clip(raw.title, TITLE_MAX) ?? '', foreground: raw.foreground === true, minimized: raw.minimized === true, userAction: raw.userAction === true };
}

/** UI 에서 읽은 것임을 표시하는 출처 태그. 명령 권한이 없다(DOM 의 'webpage' 와 같은 역할). */
export const UIA_CONTENT_SOURCE = 'app_window' as const;

/**
 * `local.uia.*` 결과가 서버에 남을 수 있는 **유일한** 필드 집합. pid · hwnd · RuntimeId · 실행 경로 · rect 좌표(크기만) 는 없다.
 */
export function pickSafeUiaInfo(data: unknown): Record<string, unknown> {
  if (!isPlain(data)) return {};
  const out: Record<string, unknown> = { source: UIA_CONTENT_SOURCE };
  if (typeof data.appId === 'string' && /^windows\.[a-z0-9_.-]{1,40}$/.test(data.appId)) out.appId = data.appId;
  if (isDomSnapshotId(data.snapshotId)) out.snapshotId = data.snapshotId;
  if (isDomElementRef(data.elementRef)) out.elementRef = data.elementRef;
  if (typeof data.role === 'string' && UIA_ROLES.includes(data.role)) out.role = data.role;
  if (typeof data.key === 'string' && UIA_ALLOWED_KEYS.includes(data.key)) out.key = data.key;
  if (typeof data.riskLevel === 'string' && SAFE_RISK.includes(data.riskLevel)) out.riskLevel = data.riskLevel;
  for (const k of ['executed', 'verified', 'hasValue', 'valueCleared', 'foregroundStill', 'truncated']) {
    if (typeof data[k] === 'boolean') out[k] = data[k];
  }
  if (data.clicks === 1 || data.clicks === 2) out.clicks = data.clicks;
  // SAFETY-V1 §48·§59: 안전층 판정 요약 — 사유 enum · 멈춤 여부 · 재검사 횟수만.
  if (isPlain(data.safety)) {
    const reason = typeof data.safety.reason === 'string' && SAFE_SAFETY_REASONS.includes(data.safety.reason) ? data.safety.reason : undefined;
    out.safety = { ...(reason ? { reason } : {}), paused: data.safety.paused === true, retries: typeof data.safety.retries === 'number' && Number.isInteger(data.safety.retries) && data.safety.retries >= 0 && data.safety.retries <= 10 ? data.safety.retries : 0 };
  }
  if (typeof data.elementCount === 'number' && Number.isInteger(data.elementCount) && data.elementCount >= 0 && data.elementCount <= 10000) out.elementCount = data.elementCount;
  if (Array.isArray(data.elements)) {
    const els: SafeUiaElement[] = [];
    for (const item of data.elements) {
      if (els.length >= UIA_MAX_ELEMENTS) break;
      const e = pickSafeUiaElement(item);
      if (e) els.push(e);
    }
    out.elements = els;
  }
  if (Array.isArray(data.windows)) {
    const ws: SafeUiaWindow[] = [];
    for (const item of data.windows) {
      if (ws.length >= 20) break;
      const w = pickSafeUiaWindow(item);
      if (w) ws.push(w);
    }
    out.windows = ws;
  }
  return out;
}
