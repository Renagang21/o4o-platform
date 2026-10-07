/**
 * Goal-Driven Multimodal Work Agent V0 — Goal · Observation · Plan · Action · Result · Takeover 계약 (순수)
 *
 * WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §3·§5·§7~§11·§13·§16~§19·§22·§23·§34~§36·§40·§45~§47
 * 상위 원칙: docs/baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   Work Loop 의 **형상과 검증 규칙**이다. 실행(DOM 명령 발행 · AI 호출)은 work-agent-runtime.ts 가 한다.
 *
 *   Goal          사용자의 자연어 목적. 메뉴명 · URL · 클릭 순서를 요구하지 않는다(§5).
 *   Observation   등재 site 탭의 구조화 요약(get_context + inspect). 전체 HTML 은 없다(§7). source=webpage · UNTRUSTED.
 *   Proposal      AI Planner 가 제안한 **다음 행동 하나**. 기존 DOM tool 어휘 안에서만 표현된다(§10).
 *   Validation    Runtime 이 proposal 을 검증한다 — 행동 종류 allowlist · elementRef 는 직전 관찰에 있던 것 ·
 *                 입력 텍스트는 DOM 입력 거절 규칙 · find 조건은 DOM 5키 · takeover 사유는 등재분(§9·§10).
 *   Progress      행동 성공 ≠ 목적 달성(§17). progress · no_progress · needs_user · completed · failed(§18).
 *   Takeover      실패가 아니다(§21). 사유를 등재분으로 남긴다(§19).
 *   Loop safety   maxSteps · maxAiPlans · maxDuration · 반복 행동 · 무진전(§34~§36).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AI 는 실행 권한이 없다 (§9·§10·§47)
 *
 *   URL · CSS selector · XPath · JavaScript · shell · credential 을 실을 칸이 이 계약에 없다. Planner 가 그런 키를
 *   돌려주면 `validateWorkProposal` 이 거절한다. elementRef 는 확장이 발급한 것이며 직전 관찰에 없으면 거절된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 실행 상태는 runtime/session 수준이다 (§37~§41 · WEB-AUTOMATION-RESUME-V1 PHASE 1 완화)
 *
 *   한 요청의 `WorkAgentState`(관찰·proposal·step 등 실행 상태 전문)는 여전히 요청 안에서만 산다 — DB 에 넣지 않는다.
 *   PHASE 1 이 새로 허용하는 것은 **logical Work Run 의 재개**에 필요한 최소한뿐이다:
 *     · runId 로 식별되는 logical run 을 **Local SQLite**(사용자 PC, 정본)에 최소 semantic 상태로 남긴다.
 *     · Cloud 에는 **최소 coordination**(runId · 소유자 · device · status · version · 만료)만 둔다 —
 *       goal/질문/답변 원문 · DOM · 관찰 · trajectory · step 전문은 cloud 에 넣지 않고, cloud 는 Local 을 read-back 하지 않는다.
 *     · 재개 = 같은 runId + **현재 화면 재관찰** + planner re-prime. 저장된 관찰을 되살리지 않는다.
 *   PHASE 2(Workflow Candidate · IR §8·§9-3·§9-4)가 더 허용하는 것도 이것뿐이다:
 *     · 성공 run 의 **값 없는 semantic 단계**(행동 종류 · role·name|text · 예상 변화) + 요청 템플릿을 Local SQLite 에 저장한다
 *       (서버 → Local write, 명령 인자로 한 번 지나갈 뿐 cloud 에 저장하지 않는다).
 *     · 재생용 조회는 Local 이 템플릿을 대조해 **이번 요청의 값을 채운 단계만** 돌려준다 — 과거 요청 문장 · 템플릿 · 통계는
 *       돌아오지 않는다. 재생은 같은 loop 안의 bounded prefix 이며(현재 화면 재검증 · 어긋나면 AI loop), 엔진이 아니다.
 *   `automation_jobs` 는 이 축에 재사용하지 않는다(video 트랙 전용). 다음은 PHASE 1 이후로도 계속 금지한다:
 *     scheduler · background queue · executor · general workflow engine · agent loop · retry orchestration ·
 *     planner state machine · tool execution queue · background worker · 사이트별 사전 정의 workflow ·
 *     단일 실행의 공용 workflow 자동 승격 · Safety/Risk/capability 완화.
 *   `automation_jobs is a lightweight persistent work record. It is not a scheduler, executor, workflow engine,
 *    agent runtime, or tool execution queue.`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V2 정렬 (2026-10-03 · WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1)
 *
 *   정본이 `O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2` 로 바뀌었다(AGENT-ARCHITECTURE-V1 SUPERSEDED).
 *   · 위 "Local SQLite(정본)" · "Cloud 에는 최소 coordination" 은 **현재 구현의 저장 위치**를 적은 것이다. V2 의 원칙은
 *     Local-first 가 아니라 Ownership-first(V2 §9) — 기억은 organization · user · run 에, 실행환경 상태만 node 에 속한다.
 *     실제 저장 위치 이동은 V2 §17 Legal / Data Processing Gate 이후(단계 C)이며 Phase A 는 옮기지 않는다.
 *   · Cloud 에 새로 생긴 것은 Personal Assistant 의 **Task**(`assistant_tasks` — 구조 metadata 만)와
 *     run → Task 연결(`work_run_coordination.task_id`, Task 1 : N run)뿐이다. goal/질문/답변 원문 · 관찰 · step 전문은
 *     여전히 cloud 에 넣지 않는다. Task 는 위 금지 목록의 어느 것(scheduler · queue · workflow engine · planner state
 *     machine 등)도 아니다 — 실행 순서를 정하지 않고, 대기열이 아니며, 재시도를 orchestrate 하지 않는다.
 *   · 업무 판단(Assistant Planning)과 화면 조작 판단(Execution Planning)의 분리는 V2 §18 단계 B 이며 여기서 하지 않는다.
 */

import type { DomFindQuery, SafeDomElement } from '../local-agent/browser-dom-contract.js';
import { DOM_QUERY_VALUE_MAX, domInputDenyReason, isDomElementRef, validateDomFindQuery } from '../local-agent/browser-dom-contract.js';
import type { AutomationRiskLevel, ContentProvenance } from './automation-execution-contract.js';
import { UIA_ALLOWED_KEYS, UIA_POINTER_ROLES } from '../local-agent/windows-uia-contract.js';
import {
  buildRecoveryUsageFields,
  createRecoveryState,
  type RecoveryState,
  type RecoveryUsageFields,
} from './automation-recovery-contract.js';
import { findWindowsApp } from '../local-agent/windows-app-registry.js';
import {
  sanitizeAsk,
  sanitizeStageKey,
  sanitizeStrategy,
  sanitizeTaskKey,
  sanitizeUserInput,
  type CloudRecalledPattern,
  type DerivedPattern,
  type ProposalAsk,
  type ProposalUserInput,
  type RunResumeFrame,
  type Strategy,
} from './work-assistance.js';
import { COMPUTER_ALLOWED_KEYS, textDenyReason as computerTextDenyReason } from '../local-agent/computer-use-contract.js';

// ─── Goal (§5) ──────────────────────────────────────────────────────────────

/**
 * QUESTION 과 TAKEOVER 는 **별개 상태**다(WEB-AUTOMATION-RESUME-V1 §IR).
 *   waiting_for_user — QUESTION. logical run 유지 · 사용자가 답하면 같은 runId 로 재개.
 *   taken_over       — TAKEOVER. automation 종료 · 사용자 직접 · 자동 resume 대상 아님.
 *                      never-escalate 영역(조제보고·마약류·정부 제출·청구·결제·전자서명·외부전송)은 항상 여기.
 *   stopped          — 사용자/시스템이 멈춘 비목표달성 종료(재개 대상 아님).
 */
export type WorkGoalStatus = 'active' | 'waiting_for_user' | 'completed' | 'stopped' | 'taken_over';

export interface WorkGoal {
  goalId: string;
  /**
   * logical Work Run 식별자(PHASE 1). 재개의 유일한 앵커 — 같은 runId 로 다시 오면 같은 업무를 잇는다.
   * 새 run 은 goalId 를 그대로 승격해 쓴다. 미지정이면 이 요청 안에서만 사는 run 으로 본다.
   */
  runId?: string;
  /** 사용자의 자연어 목적. 프롬프트 · 결과에는 쓰지만 로그에는 싣지 않는다(§23). */
  request: string;
  /** 등재 site 힌트(siteId). 문장의 별칭으로도 정해진다. */
  targetHint?: string;
  status: WorkGoalStatus;
}

export const WORK_GOAL_MAX_LENGTH = 2000;

export function isValidWorkGoalRequest(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= WORK_GOAL_MAX_LENGTH;
}

// ─── 입력 · 출처 (§11·§45·§46) ──────────────────────────────────────────────

/** 명령 권한이 있는 출처는 user · system 뿐. 나머지는 데이터다(§45). */
export type WorkInputProvenance = ContentProvenance | 'user_image' | 'user_file';

export const UNTRUSTED_PROVENANCE: readonly WorkInputProvenance[] = Object.freeze(['webpage', 'local_app_ui', 'user_image', 'user_file']);

export function isUntrustedProvenance(p: WorkInputProvenance): boolean {
  return UNTRUSTED_PROVENANCE.includes(p);
}

/** 사용자가 Goal 과 함께 준 이미지(§11·§12). 메모리에서만 다루고 저장하지 않는다(§23). */
export interface WorkImageInput {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 순수 base64. */
  base64: string;
  /** user_image=사용자 첨부(§11) · screen_capture=UIA fallback 시 등재 앱 foreground client 캡처(§4). 둘 다 UNTRUSTED. */
  provenance: 'user_image' | 'screen_capture';
}

export const WORK_IMAGE_MIME_TYPES: readonly string[] = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const WORK_IMAGE_MAX_BASE64_LENGTH = 10 * 1024 * 1024;

export function validateWorkImageInput(v: unknown): { ok: boolean; image?: WorkImageInput } {
  if (v === undefined || v === null) return { ok: true };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false };
  const r = v as Record<string, unknown>;
  if (typeof r.mimeType !== 'string' || !WORK_IMAGE_MIME_TYPES.includes(r.mimeType)) return { ok: false };
  if (typeof r.base64 !== 'string' || r.base64.length === 0 || r.base64.length > WORK_IMAGE_MAX_BASE64_LENGTH) return { ok: false };
  const payload = r.base64.replace(/^data:[^;]+;base64,/, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(payload)) return { ok: false };
  return { ok: true, image: { mimeType: r.mimeType as WorkImageInput['mimeType'], base64: payload, provenance: 'user_image' } };
}

// ─── Observation (§7) ───────────────────────────────────────────────────────

/** 관찰 요소 — DOM 요소 형상 + UIA 축이 더하는 힌트(editable · size · focused · userAction). */
export type WorkElement = SafeDomElement & { editable?: boolean; size?: [number, number]; focused?: boolean; userAction?: boolean; windowRef?: string };

/** WINDOWS-UI-AUTOMATION-V0 — 관찰/행동이 어느 표면에서 오는가. dom = 브라우저 탭(content script), uia = Windows 앱 창(UIA). */
export type WorkSurface = 'dom' | 'uia';

export interface WorkObservation {
  siteId: string;
  /** pathname 만(query 없음). uia 표면은 `window:<foreground 창 제목>`. */
  path: string;
  ready: boolean;
  /** inspect 요약 — 전체 HTML 이 아니다. 80개 상한은 DOM 계약(uia 는 150). */
  elements: WorkElement[];
  elementCount: number;
  source: 'webpage' | 'app_window';
  surface?: WorkSurface;
  /** uia 표면: 앱의 보이는 창 목록(제목은 UI 라벨 — UNTRUSTED). */
  windows?: { windowRef: string; title: string; foreground: boolean; userAction: boolean }[];
  /** 무진전 판정용 지문(§35). 경로 + 요소 role/name/text 의 요약. */
  fingerprint: string;
  /** content script 의 문서 인스턴스 id. 이동 뒤 "새 문서를 봤는가" 판정용(무작위 값, 내용 무관). */
  docId?: string;
  /**
   * WO-O4O-WINDOWS-VISUAL-COMPUTER-USE-AND-FAST-LOOP-V1 §4 — 이 관찰이 **Visual Computer Use fallback** 관찰인가.
   * UIA 가 요소를 노출하지 못해 화면 이미지를 planner 에 넘긴 상태에서만 true. 이때에만 visual_* 행동이 허용된다.
   * (이미지 base64 자체는 여기에 담지 않는다 — 로그·지문에 새지 않도록 runtime 이 planner 호출에만 따로 넘긴다.)
   */
  visualFallback?: boolean;
}

export function fingerprintObservation(path: string, elements: readonly SafeDomElement[]): string {
  const parts = elements.slice(0, 80).map((e) => `${e.role}:${e.name ?? e.text ?? ''}${e.disabled ? '!' : ''}`);
  return `${path}|${parts.join(',')}`;
}

/** Planner 에게 보여줄 한 줄 요약. ref · role · 이름/텍스트 · 상태만. uia 는 editable · 크기 · focus 힌트를 더한다. */
export function describeObservationElement(e: WorkElement): string {
  const bits = [e.elementRef, e.role];
  if (e.windowRef) bits.push(`win=${e.windowRef}`);
  if (e.name) bits.push(`name="${e.name}"`);
  if (e.text) bits.push(`text="${e.text}"`);
  if (e.hasValue) bits.push('has-value');
  if (e.editable) bits.push('editable');
  if (e.focused) bits.push('focused');
  if (e.size) bits.push(`size=${e.size[0]}x${e.size[1]}`);
  if (e.disabled) bits.push('disabled');
  if (e.userAction) bits.push('USER_ACTION(로그인/인증 창 — 입력 금지)');
  if (e.riskLevel === 'COMMIT') bits.push('COMMIT(자동 클릭 금지)');
  return bits.join(' ');
}

// ─── Proposal (§8·§10) ──────────────────────────────────────────────────────

/** Planner 가 제안할 수 있는 행동 종류 — 전부 기존 DOM/UIA tool 또는 loop 제어다. 새 실행 수단은 없다. */
export const WORK_ACTION_KINDS = Object.freeze([
  'inspect', 'find', 'read_text', 'read_table', 'set_input', 'select_option', 'click', 'takeover', 'done',
  // WINDOWS-UI-AUTOMATION-V0 — uia 표면 전용: 허용 키 1회(입력창 제출 포함). dom 표면에서는 거절된다.
  'key',
  // WO-O4O-WINDOWS-VISUAL-COMPUTER-USE-AND-FAST-LOOP-V1 §4 — Visual Computer Use.
  //   UIA 가 화면 요소를 노출하지 못할 때만(observation.visualFallback), AI 가 캡처 이미지를 보고
  //   client 영역 정규화 0..1 좌표/텍스트/허용키로 직접 조작한다. 기존 local.computer.* 로 실행되며
  //   elementRef 를 요구하지 않는다(요소가 없기 때문이다). structured-first 는 유지 — UIA 로 보이는
  //   요소는 여전히 UIA(click/set_input/key)로만 다룬다.
  'visual_click', 'visual_type', 'visual_key',
] as const);
export type WorkActionKind = (typeof WORK_ACTION_KINDS)[number];

/** 한 plan 에 실을 수 있는 행동 배치 상한(§7 Fast Loop). runtime 이 각 행동마다 안전 재검증·중단 조건을 본다. */
export const WORK_BATCH_MAX = 4;
/**
 * 배치에 담을 수 있는 행동 종류 — **화면을 바꾸는 실행 행동만**. inspect·find·read_text·read_table 은
 * 결과가 Planner 입력이 되어야 하므로(=다음에 AI 가 필요) 배치로 이어 실행하지 않는다. takeover·done 은 단일 제어다.
 */
const BATCHABLE_ACTION_KINDS: readonly string[] = Object.freeze([
  'set_input', 'select_option', 'click', 'key', 'visual_click', 'visual_type', 'visual_key',
]);

export type WorkProgress = 'progress' | 'no_progress' | 'needs_user' | 'completed' | 'failed';
export const WORK_PROGRESS_VALUES: readonly string[] = Object.freeze(['progress', 'no_progress', 'needs_user', 'completed', 'failed']);

/** Takeover 사유(§19). 등재분 밖은 거절된다. */
export const TAKEOVER_REASONS = Object.freeze([
  // WINDOWS-AUTOMATION-SAFETY-V1 §32 — agent 안전층이 멈춘 사유(정상 인계).
  'user_active', 'target_changed', 'target_identity_uncertain', 'uia_target_ambiguous', 'uia_hidden_control', 'submit_not_verified', 'key_semantics_unknown', 'vision_uncertain', 'unexpected_window',
  'goal_sufficiently_advanced',
  'user_judgment_required',
  'ambiguous_result',
  'unsupported_control',
  'review_required',
  'commit_required',
  'credential_required',
  'site_not_ready',
  'no_progress',
  'loop_limit',
  'planner_unavailable',
] as const);
export type TakeoverReason = (typeof TAKEOVER_REASONS)[number];

export interface WorkAction {
  kind: WorkActionKind;
  elementRef?: string;
  query?: DomFindQuery;
  text?: string;
  option?: string;
  reason?: TakeoverReason;
  /** uia: key 행동의 키(ENTER · TAB · ESC · CTRL+ENTER). */
  key?: string;
  /** uia: 요소 rect 안 정규화 좌표 클릭(0..1) — UIA 가 항목을 노출하지 않는 목록/창의 fallback. */
  x?: number;
  y?: number;
  clicks?: 1 | 2;
}

export interface WorkProposal {
  /** 직전 결과 · 현재 상태에 대한 판단(§17·§18). */
  assessment: WorkProgress;
  /** 다음 행동 하나. 배치가 있으면 그 첫 행동과 같다(단일 실행 경로 하위호환). */
  action: WorkAction;
  /**
   * WO-O4O-...-FAST-LOOP-V1 §7 — 짧은 행동 배치(최대 WORK_BATCH_MAX). 있으면 runtime 이
   * 각 행동마다 안전을 재검증하며 연속 실행하고, 화면 변화·새 창·모달·오류 등 중단 조건에서 즉시 멈추고 재관찰한다.
   * 검증을 통과한 실행 행동만 담긴다(inspect/takeover/done 은 배치 밖).
   */
  batch?: WorkAction[];
  /** 짧은 근거(프롬프트 표시용 · 로그 미기록). */
  rationale?: string;
  /** 지금 필요한 사용자 입력이 무엇인지(§11 need-based). */
  neededInput?: string;
  // ── Phase 2 업무 구조 선언(WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1). 선택 · 잘못되면 그 칸만 버린다. ──
  /** 업무 키(snake_case 점 표기, 예: drug_info.same_ingredient). 값이 들어갈 수 없는 형식. */
  task?: string;
  /** 지금 단계 키(snake_case). */
  stage?: string;
  /** 이번 단계에서 쓰려는 방법(op 어휘 나열). Avoid 대조 대상. */
  strategy?: Strategy;
  /** 질문(needs_user)일 때 무엇을 묻는가 + 채울 자리 키. */
  ask?: ProposalAsk;
  /** 사용자 입력(재개 답변 · 요청 안의 방법 지시)을 분류한 구조. 원문 없음. */
  userInput?: ProposalUserInput;
  /**
   * 완료 근거(WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1) — 실행 지시에 완료조건(criteria)이 있을 때
   * planner 가 `done` 과 함께 "어느 조건을 화면의 어떤 글로 확인했는가" 를 보고한다. 완료 판정은 Assistant 가 한다.
   * 화면 글 인용이 들어가므로 로그 · 저장 대상이 아니다(메모리 안에서만 Assistant 로 전달).
   */
  evidence?: ProposalEvidence[];
}

export interface ProposalEvidence {
  /** 실행 지시의 완료조건 id(c1..c4). */
  criterion: string;
  /** read = read_text/read_table 결과 · screen = 관찰(요소 이름 · 화면 글). */
  source: 'read' | 'screen';
  /** 화면에서 그대로 옮긴 짧은 인용(≤ EVIDENCE_QUOTE_MAX). runtime 이 이번 run 에서 실제 본 글인지 대조한다. */
  quote: string;
}

export const EVIDENCE_QUOTE_MAX = 120;
export const EVIDENCE_ITEMS_MAX = 4;
const CRITERION_ID_RE = /^c[1-4]$/;

/** planner 의 evidence 칸 정리 — 형식 밖 항목만 버린다(proposal 거절 사유 아님). */
export function sanitizeProposalEvidence(raw: unknown): ProposalEvidence[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ProposalEvidence[] = [];
  for (const item of raw.slice(0, EVIDENCE_ITEMS_MAX * 2)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const it = item as Record<string, unknown>;
    if (typeof it.criterion !== 'string' || !CRITERION_ID_RE.test(it.criterion)) continue;
    if (typeof it.quote !== 'string' || it.quote.trim().length === 0) continue;
    if (it.source !== 'read' && it.source !== 'screen') continue;
    const source: ProposalEvidence['source'] = it.source;
    out.push({ criterion: it.criterion, source, quote: it.quote.trim().slice(0, EVIDENCE_QUOTE_MAX) });
    if (out.length >= EVIDENCE_ITEMS_MAX) break;
  }
  return out.length ? out : null;
}

/** 근거 대조용 정규화 — 공백 제거 · 소문자. */
export function normalizeEvidenceText(v: string): string {
  return String(v ?? '').replace(/\s+/g, '').toLowerCase();
}

export type ProposalRejectReason =
  | 'SHAPE'
  | 'UNKNOWN_ACTION'
  | 'FORBIDDEN_KEY'
  | 'ELEMENT_NOT_IN_OBSERVATION'
  | 'ELEMENT_ROLE_MISMATCH'
  | 'TEXT_DENIED'
  | 'QUERY_INVALID'
  | 'TAKEOVER_REASON_INVALID'
  | 'COMMIT_TARGET'
  | 'SURFACE_MISMATCH'
  | 'KEY_INVALID'
  | 'USER_ACTION_WINDOW'
  | 'WINDOW_NOT_NAMED_IN_GOAL'
  | 'SAFETY_REJECT'
  /** 이 Task × Target × stage 에서 검증된 Avoid 방법을 다시 쓰려 했다(Phase 2 §7-6). runtime 이 판정한다. */
  | 'AVOID_PATTERN';

/** URL · selector · JS · shell · credential 을 실어 오는 키 — 있으면 proposal 전체를 거절한다(§10·§47). */
export const FORBIDDEN_PROPOSAL_KEYS: readonly string[] = Object.freeze([
  'url', 'href', 'navigate', 'selector', 'css', 'xpath', 'js', 'javascript', 'script', 'eval', 'shell', 'command', 'cmd',
  'password', 'otp', 'token', 'cookie', 'credential', 'capability', 'permission', 'riskLevel', 'computer', 'coordinates',
]);

const INPUT_ROLES: readonly string[] = Object.freeze(['textbox', 'searchbox', 'textarea']);
const CLICK_ROLES: readonly string[] = Object.freeze(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem']);
const SELECT_ROLES: readonly string[] = Object.freeze(['combobox']);

function hasForbiddenKey(obj: unknown, depth = 0): boolean {
  if (!obj || typeof obj !== 'object' || depth > 3) return false;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_PROPOSAL_KEYS.includes(k)) return true;
    if (v && typeof v === 'object' && hasForbiddenKey(v, depth + 1)) return true;
  }
  return false;
}

function shortText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= DOM_QUERY_VALUE_MAX && !/[<>{}]/.test(v);
}

/**
 * 행동 하나를 검증한다(§9·§10). 단일 proposal 과 배치 항목이 **같은 규칙**을 지나도록 분리했다.
 *   - 형상 · 행동 종류에 맞는 role/필드.
 *   - elementRef 는 **직전 관찰에 있던 것**이어야 하고 행동에 맞는 role 이어야 한다.
 *   - click 대상이 관찰에서 COMMIT 으로 표시됐으면 거절(확장/UIA 도 다시 막는다).
 *   - set_input/visual_type 텍스트는 입력 거절 규칙(비밀번호 · 명령어 성격 · 길이 초과)을 통과해야 한다.
 *   - visual_* 는 observation.visualFallback 일 때만 허용(structured-first 보존).
 * 반환: 검증된 WorkAction(정규화 사본) 또는 거절 사유.
 */
// NOTE: strictNullChecks off → 판별 유니온의 부정 내로잉(`if (!x.ok)`)이 동작하지 않는다(ref-api-server-strictnullchecks-no-negation-narrowing).
// 그래서 성공/실패를 유니온이 아니라 두 필드 다 접근 가능한 한 형상으로 돌린다 — 호출자는 ok 로 분기하고 action/reason 을 그대로 읽는다.
function validateSingleAction(act: Record<string, unknown>, observation: WorkObservation | null): { ok: boolean; action?: WorkAction; reason?: ProposalRejectReason } {
  const kind = act.kind;
  if (typeof kind !== 'string' || !(WORK_ACTION_KINDS as readonly string[]).includes(kind)) return { ok: false, reason: 'UNKNOWN_ACTION' };
  const action: WorkAction = { kind: kind as WorkActionKind };
  const surface: WorkSurface = observation?.surface ?? 'dom';
  const visualOk = surface === 'uia' && observation?.visualFallback === true;
  const byRef = new Map<string, WorkElement>();
  for (const e of observation?.elements ?? []) byRef.set(e.elementRef, e);
  const requireRef = (roles: readonly string[] | null): { ok: boolean; reason?: ProposalRejectReason } => {
    if (!isDomElementRef(act.elementRef)) return { ok: false, reason: 'SHAPE' };
    const el = byRef.get(act.elementRef);
    if (!el) return { ok: false, reason: 'ELEMENT_NOT_IN_OBSERVATION' };
    if (roles && !roles.includes(el.role)) return { ok: false, reason: 'ELEMENT_ROLE_MISMATCH' };
    if (el.disabled) return { ok: false, reason: 'ELEMENT_ROLE_MISMATCH' };
    if (el.userAction) return { ok: false, reason: 'USER_ACTION_WINDOW' };
    action.elementRef = act.elementRef;
    return { ok: true };
  };
  const isCoord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
  const fail = (reason: ProposalRejectReason) => ({ ok: false as const, reason });
  const done = () => ({ ok: true as const, action });

  switch (kind) {
    case 'inspect':
    case 'done':
      return done();
    case 'takeover': {
      if (typeof act.reason !== 'string' || !(TAKEOVER_REASONS as readonly string[]).includes(act.reason)) return fail('TAKEOVER_REASON_INVALID');
      action.reason = act.reason as TakeoverReason;
      return done();
    }
    case 'find': {
      const q = validateDomFindQuery(act.query);
      if (!q.ok || !q.query) return fail('QUERY_INVALID');
      action.query = q.query;
      return done();
    }
    case 'key': {
      // uia 표면 전용. 허용 키만, elementRef 가 있으면 관찰 안의 입력창이어야 한다.
      if (surface !== 'uia') return fail('SURFACE_MISMATCH');
      if (typeof act.key !== 'string' || !UIA_ALLOWED_KEYS.includes(act.key)) return fail('KEY_INVALID');
      // SAFETY-V1 §20·§21: 앱 profile 로 키 의미를 안다. profile 이 없으면 제출/취소 성격 키는 제안 단계에서 거절, 위험 키(riskyKeys)도 거절.
      const profile = observation?.siteId ? findWindowsApp(observation.siteId)?.interactionProfile : undefined;
      const submitClass = act.key === 'ENTER' || act.key === 'CTRL+ENTER' || act.key === 'ESC';
      if (!profile && submitClass) return fail('KEY_INVALID');
      if (profile && profile.riskyKeys.includes(act.key)) return fail('KEY_INVALID');
      action.key = act.key;
      if (act.elementRef !== undefined) {
        const r2 = requireRef(INPUT_ROLES);
        if (!r2.ok) return fail(r2.reason ?? 'SHAPE');
      }
      return done();
    }
    case 'read_table': {
      if (surface === 'uia') return fail('SURFACE_MISMATCH');
      if (act.elementRef === undefined) return done();
      const r2 = requireRef(['table']);
      return r2.ok ? done() : fail(r2.reason ?? 'SHAPE');
    }
    case 'read_text': {
      const r2 = requireRef(null);
      return r2.ok ? done() : fail(r2.reason ?? 'SHAPE');
    }
    case 'set_input': {
      const r2 = requireRef(INPUT_ROLES);
      if (!r2.ok) return fail(r2.reason ?? 'SHAPE');
      if (typeof act.text !== 'string' || act.text.trim().length === 0 || domInputDenyReason(act.text) !== null || /[<>{}]/.test(act.text)) return fail('TEXT_DENIED');
      // uia 표면은 computer-use 텍스트 규칙(길이 · 제어문자 · credential 성격)도 지난다.
      if (surface === 'uia' && computerTextDenyReason(act.text) !== null) return fail('TEXT_DENIED');
      action.text = act.text.trim().slice(0, DOM_QUERY_VALUE_MAX);
      return done();
    }
    case 'select_option': {
      if (surface === 'uia') return fail('SURFACE_MISMATCH');
      const r2 = requireRef(SELECT_ROLES);
      if (!r2.ok) return fail(r2.reason ?? 'SHAPE');
      if (!shortText(act.option)) return fail('TEXT_DENIED');
      action.option = act.option;
      return done();
    }
    case 'click': {
      // uia 표면의 좌표 클릭 — UIA 가 항목을 노출하지 않는 목록/창 안의 위치를 누른다(0..1 · clicks 1|2).
      if (act.x !== undefined || act.y !== undefined || act.clicks !== undefined) {
        if (surface !== 'uia') return fail('SURFACE_MISMATCH');
        if (!isCoord(act.x) || !isCoord(act.y)) return fail('SHAPE');
        if (act.clicks !== undefined && act.clicks !== 1 && act.clicks !== 2) return fail('SHAPE');
        const r3 = requireRef(UIA_POINTER_ROLES);
        if (!r3.ok) return fail(r3.reason ?? 'SHAPE');
        const el3 = byRef.get(String(act.elementRef));
        if (el3?.riskLevel === 'COMMIT') return fail('COMMIT_TARGET');
        action.x = act.x;
        action.y = act.y;
        if (act.clicks === 1 || act.clicks === 2) action.clicks = act.clicks;
        return done();
      }
      // uia: listitem(선택) · window(그 창을 앞으로) 도 클릭 대상이다.
      const r2 = requireRef(surface === 'uia' ? [...CLICK_ROLES, 'listitem', 'window'] : CLICK_ROLES);
      if (!r2.ok) return fail(r2.reason ?? 'SHAPE');
      const el = byRef.get(String(act.elementRef));
      if (el?.riskLevel === 'COMMIT') return fail('COMMIT_TARGET');
      return done();
    }
    // ── Visual Computer Use (§4) — elementRef 없이 client 영역 정규화 좌표/텍스트/허용키. visualFallback 관찰에서만. ──
    case 'visual_click': {
      // local.computer.click 원형은 {x,y} 정확히 두 키만 받는다(더블클릭·clicks 없음). 단일 클릭만 표현한다.
      if (!visualOk) return fail('SURFACE_MISMATCH');
      if (!isCoord(act.x) || !isCoord(act.y)) return fail('SHAPE');
      if (act.clicks !== undefined) return fail('SHAPE');
      action.x = act.x;
      action.y = act.y;
      return done();
    }
    case 'visual_type': {
      if (!visualOk) return fail('SURFACE_MISMATCH');
      // computer-use 텍스트 규칙(길이 1~500 · 제어문자 · credential/OTP/명령어 성격) 그대로. HTML 문자도 거절.
      if (typeof act.text !== 'string' || act.text.length === 0 || computerTextDenyReason(act.text) !== null || /[<>{}]/.test(act.text)) return fail('TEXT_DENIED');
      action.text = act.text;
      return done();
    }
    case 'visual_key': {
      if (!visualOk) return fail('SURFACE_MISMATCH');
      // computer.key 는 ENTER · TAB · ESC 만(조합키 없음).
      if (typeof act.key !== 'string' || !COMPUTER_ALLOWED_KEYS.includes(act.key)) return fail('KEY_INVALID');
      action.key = act.key;
      return done();
    }
    default:
      return fail('UNKNOWN_ACTION');
  }
}

/**
 * Planner 응답 → 검증된 proposal(§9·§10). Runtime 이 실행 직전에 부른다.
 *   - 형상 · 금지 키(URL · selector · JS · shell · credential).
 *   - `action` 하나를 validateSingleAction 으로 검증한다.
 *   - `actions`(배치, §7 Fast Loop)가 있으면 각 항목을 같은 규칙으로 검증한다 — 실행 행동만, 최대 WORK_BATCH_MAX.
 */
export function validateWorkProposal(
  raw: unknown,
  observation: WorkObservation | null,
  meta: { forbiddenValues?: readonly string[] } = {},
): { ok: boolean; proposal?: WorkProposal; reason?: ProposalRejectReason } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'SHAPE' };
  if (hasForbiddenKey(raw)) return { ok: false, reason: 'FORBIDDEN_KEY' };
  const r = raw as Record<string, unknown>;
  const assessment = typeof r.assessment === 'string' && WORK_PROGRESS_VALUES.includes(r.assessment) ? (r.assessment as WorkProgress) : 'progress';
  const a = r.action;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return { ok: false, reason: 'SHAPE' };
  const single = validateSingleAction(a as Record<string, unknown>, observation);
  if (!single.ok) return { ok: false, reason: single.reason };
  const out: WorkProposal = { assessment, action: single.action };
  if (typeof r.rationale === 'string') out.rationale = r.rationale.slice(0, 200);
  if (typeof r.neededInput === 'string') out.neededInput = r.neededInput.slice(0, 200);

  // 배치(선택) — 있으면 실행 행동만, 최대 WORK_BATCH_MAX. 하나라도 어긋나면 proposal 전체를 거절한다(부분 실행 금지).
  if (r.actions !== undefined) {
    if (!Array.isArray(r.actions) || r.actions.length === 0 || r.actions.length > WORK_BATCH_MAX) return { ok: false, reason: 'SHAPE' };
    const batch: WorkAction[] = [];
    for (const item of r.actions) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, reason: 'SHAPE' };
      if (hasForbiddenKey(item)) return { ok: false, reason: 'FORBIDDEN_KEY' };
      const it = item as Record<string, unknown>;
      if (typeof it.kind !== 'string' || !BATCHABLE_ACTION_KINDS.includes(it.kind)) return { ok: false, reason: 'UNKNOWN_ACTION' };
      const checked = validateSingleAction(it, observation);
      if (!checked.ok) return { ok: false, reason: checked.reason };
      batch.push(checked.action);
    }
    out.batch = batch;
  }
  // Phase 2 업무 구조 — 형식 밖이면 그 칸만 버린다(실행 행동 검증과 무관 · proposal 거절 사유가 아니다).
  // label 에는 이번 run 의 입력값(사용자 답변 · 입력/선택 텍스트)이 들어갈 수 없다.
  const forbidden = [
    ...(meta.forbiddenValues ?? []),
    ...[out.action, ...(out.batch ?? [])].flatMap((x) => [x.text, x.option]).filter((v): v is string => typeof v === 'string'),
  ];
  const task = sanitizeTaskKey(r.task);
  if (task) out.task = task;
  const stage = sanitizeStageKey(r.stage);
  if (stage) out.stage = stage;
  const strategy = sanitizeStrategy(r.strategy, forbidden);
  if (strategy) out.strategy = strategy;
  const ask = sanitizeAsk(r.ask);
  if (ask) out.ask = ask;
  const userInput = sanitizeUserInput(r.userInput, forbidden);
  if (userInput) out.userInput = userInput;
  const evidence = sanitizeProposalEvidence(r.evidence);
  if (evidence) out.evidence = evidence;
  return { ok: true, proposal: out };
}

/** 같은 행동인지(반복 감지 §36). */
export function sameWorkAction(a: WorkAction | undefined, b: WorkAction | undefined): boolean {
  if (!a || !b) return false;
  return a.kind === b.kind && a.elementRef === b.elementRef && a.text === b.text && a.option === b.option && a.key === b.key && a.x === b.x && a.y === b.y && JSON.stringify(a.query ?? null) === JSON.stringify(b.query ?? null);
}

/**
 * WINDOWS-UI-AUTOMATION-V0 제출 경계 — 입력창에서 ENTER/CTRL+ENTER 는 "그 창에 보내기" 다. 보내는 창(foreground 창 제목)이
 * 사용자 요청 문장에 **이름으로 들어 있어야** 한다. 대화 상대를 Planner 가 고르는 경로를 막는 최소 구조 규칙이다.
 */
export function isSubmitWindowNamedInGoal(observation: WorkObservation | null, request: string): boolean {
  const fg = observation?.windows?.find((w) => w.foreground) ?? observation?.windows?.[0];
  const title = String(fg?.title ?? '').replace(/\s+/g, '');
  if (!title) return false;
  return String(request ?? '').replace(/\s+/g, '').includes(title);
}

// ─── Loop safety (§34~§36) ──────────────────────────────────────────────────

export const WORK_LOOP_LIMITS = Object.freeze({
  /** DOM 명령 상한(관찰 포함). */
  maxSteps: 14,
  /** AI Planner 호출 상한. */
  maxAiPlans: 8,
  maxDurationMs: 90_000,
  /** 같은 행동이 이 횟수 반복되면 no_progress. */
  maxRepeatedAction: 2,
  /** 같은 관찰 지문이 이 횟수 연속되면 no_progress. */
  maxSameObservation: 3,
  /** Planner 가 검증에 연속으로 이만큼 실패하면 takeover(planner_unavailable). */
  maxInvalidProposals: 2,
});

// ─── State (§3·§40) — 요청 안에서만 산다 ─────────────────────────────────────

export interface WorkStepRecord {
  step: number;
  action: WorkAction;
  status: 'success' | 'failed' | 'denied' | 'rejected';
  errorCode?: string;
  /** 행동 뒤 관찰에서 문서가 바뀌었는가. */
  navigated?: boolean;
  changed?: boolean;
  rejectReason?: ProposalRejectReason;
}

export interface WorkAgentState {
  goal: WorkGoal;
  siteId: string;
  observation: WorkObservation | null;
  plannedAction: WorkAction | null;
  lastResult: WorkStepRecord | null;
  stepCount: number;
  aiPlanCount: number;
  invalidProposals: number;
  history: WorkStepRecord[];
  progress: WorkProgress;
  takeover: { reason: TakeoverReason; step: number } | null;
  /** 실패→복구 계층 상태(WO-O4O-AUTOMATION-FAILURE-ESCALATION). 요청 안에서만 산다. */
  recovery: RecoveryState;
  /** 이번 요청에서 분류된 사용자 교정 수(Phase 2 · 구조 분류 기준). */
  userCorrectionCount?: number;
  startedAt: number;
}

export function createWorkAgentState(goal: WorkGoal, siteId: string, now = Date.now()): WorkAgentState {
  return {
    goal, siteId, observation: null, plannedAction: null, lastResult: null, stepCount: 0, aiPlanCount: 0, invalidProposals: 0,
    history: [], progress: 'progress', takeover: null, recovery: createRecoveryState(), startedAt: now,
  };
}

// ─── Usage signal (§22·§23) ─────────────────────────────────────────────────

/**
 * 로그에 남는 키 — 이것뿐이다. goal 원문 · 관찰 텍스트 · 입력값 · 이미지 · 페이지 텍스트는 칸이 없다.
 * 뒤쪽 6개는 복구 신호(RECOVERY_USAGE_KEYS §60) — 실패 종류·tier·복구 방법·시도 횟수·상태·개선 후보만.
 */
export const WORK_AGENT_USAGE_KEYS: readonly string[] = Object.freeze([
  'siteId', 'inputMode', 'actionCount', 'aiPlanCount', 'takeoverReason', 'takeoverStep', 'userCorrectionCount', 'completionState', 'durationMs', 'timestamp',
  'failureClass', 'recoveryTier', 'recoveryMethod', 'recoveryAttempt', 'recoveryStatus', 'improvementCandidate',
]);

export interface WorkAgentUsageEvent extends RecoveryUsageFields {
  siteId: string;
  inputMode: 'text' | 'text+image';
  actionCount: number;
  aiPlanCount: number;
  takeoverReason: TakeoverReason | null;
  takeoverStep: number | null;
  /** Phase 2: runtime 이 사용자 입력을 교정(kind=correction)으로 분류한 수. 그 밖에는 0. */
  userCorrectionCount: number;
  completionState: WorkProgress;
  durationMs: number;
  timestamp: string;
}

export function buildWorkAgentUsageEvent(
  state: WorkAgentState,
  inputMode: 'text' | 'text+image',
  now = new Date(),
  recoveryStatus: string | null = null,
): WorkAgentUsageEvent {
  return {
    siteId: state.siteId,
    inputMode,
    actionCount: state.history.filter((h) => !['inspect', 'find', 'read_text', 'read_table'].includes(h.action.kind)).length,
    aiPlanCount: state.aiPlanCount,
    takeoverReason: state.takeover?.reason ?? null,
    takeoverStep: state.takeover?.step ?? null,
    userCorrectionCount: state.userCorrectionCount ?? 0,
    completionState: state.progress,
    durationMs: Math.max(0, now.getTime() - state.startedAt),
    timestamp: now.toISOString(),
    ...buildRecoveryUsageFields(state.recovery, recoveryStatus),
  };
}

// ─── Risk (§16) ─────────────────────────────────────────────────────────────

/** 행동 종류 → 위험 등급. read 계열 READ, 입력/클릭/visual_* REVERSIBLE(요소별·화면별 COMMIT 판정은 별도). */
export function workActionRisk(kind: WorkActionKind): AutomationRiskLevel {
  return kind === 'set_input' || kind === 'select_option' || kind === 'click'
    || kind === 'visual_click' || kind === 'visual_type' || kind === 'visual_key'
    ? 'REVERSIBLE'
    : 'READ';
}

// ─── 오류 코드 ──────────────────────────────────────────────────────────────

export const WORK_AGENT_ERROR = Object.freeze({
  GOAL_INVALID: 'WORK_AGENT_GOAL_INVALID',
  SITE_UNRESOLVED: 'WORK_AGENT_SITE_UNRESOLVED',
  SITE_NOT_READY: 'WORK_AGENT_SITE_NOT_READY',
  IMAGE_INVALID: 'WORK_AGENT_IMAGE_INVALID',
  PLANNER_FAILED: 'WORK_AGENT_PLANNER_FAILED',
  NO_PROGRESS: 'WORK_AGENT_NO_PROGRESS',
  LOOP_LIMIT: 'WORK_AGENT_LOOP_LIMIT',
  /** 재개 요청(runId)이 유효하지 않다 — 이미 종료(taken_over/completed)됐거나 TTL 만료됐거나 소유자가 아니다(PHASE 1). */
  RESUME_REJECTED: 'WORK_AGENT_RESUME_REJECTED',
} as const);

// ─── Assistant ↔ Execution 경계 (Personal Assistant Phase B) ──────────────────
//
// WO-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1 · 정본 V2 §2-1 · §0-1(P3)
//
//   Assistant Planning(L1 · L2)이 Task 마다 **ExecutionIntent** 를 정해 Execution 에 넘기고,
//   Execution Planning(L3 · L4 — 이 runtime 의 planner)은 그 지시 안에서 화면 행동만 정한 뒤 **ExecutionReport** 를 돌려준다.
//   Task 의 완료는 Execution 의 `done` 이 아니라 Assistant 가 완료 계약과 보고의 근거로 판정한다.
//
//   두 타입에는 요청 원문 · 입력값 · 화면 글 · 개인정보가 없다 — enum · 구조 키 · 불리언뿐이다.
//   ExecutionIntent 에는 "어느 Workflow 를 실행하라" 는 칸이 없다. Task type 은 이어받기 힌트일 뿐 절차 선택 키가 아니다(P3).

/** Execution 의 시작 역할. Assistant 가 정하고, Execution 은 실행 중 근거(어긋남 · 교정)로 Discovery 로만 내려갈 수 있다. */
export type ExecutionStartMode = 'discovery' | 'resume';

/** Assistant 가 이번 Task 의 방법을 고를 때 참고하는 근거의 출처(V2 §0-1). */
export type PlanningEvidenceSource = 'own_experience' | 'knowledge' | 'shared_candidate' | 'discovery';

export interface PlanningEvidence {
  source: PlanningEvidenceSource;
  /** 이번 Task 에서 실제로 쓸 수 있는가(배선되지 않은 출처는 false). */
  available: boolean;
  /**
   * 그 출처가 Execution 을 구속하는가. **항상 false** — 어떤 근거도 강제 절차가 아니다.
   * 자기 Experience 도 현재 화면으로 다시 검증하며 쓰고, Shared Candidate 는 추천 후보로만 들어온다(V2 §0-1 · §10).
   */
  binding: false;
  /** 결정적(Experienced) 실행의 근거가 될 수 있는가 — 그 사용자 · 매장 자신의 검증된 Experience 만 true. */
  mayAuthorizeExperienced: boolean;
}

/** 완료 계약(V2 §4-3) — 실행 검증 기준이지 KPI 가 아니다. */
export interface CompletionContract {
  /**
   * 이 업무가 끝났다고 보려면 무엇이 있어야 하는가.
   *   criteria_evidence  Assistant 가 실행 전에 세운 완료조건(understanding.criteria)마다 근거가 있어야 한다 — 판정은 Assistant.
   *   result_observed    (이해가 없을 때의 하위호환) 결과 화면에 닿았다는 실행 근거.
   */
  requires: 'criteria_evidence' | 'result_observed';
  /** 사용자가 이어서 끝낸 것(USER_COMPLETED) · 사용자의 "됐다" 선언 · 부분 완료는 정상 결과다. */
  acceptsUserCompletion: true;
}

// ─── Task Understanding (WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1) ─────────
//
//   "무엇을 해야 하는지와 언제 업무가 끝났는지는 Execution Runtime 이 아니라 Personal Assistant 가 책임진다."
//   Assistant 는 실행 전에 요청에서 목표 · 결과 형태 · 완료조건 · 부족한 정보를 세우고(TaskUnderstanding),
//   Execution 은 그 조건을 보고 일한 뒤 결과와 근거(ExecutionEvidence)를 돌려준다. 끝났는지는 Assistant 가 비교해 정한다.
//
//   이해는 요청 원문에서 파생한 글을 담으므로 **로그 · DB 저장 대상이 아니다**(V2 §17 원문 미저장). 프로세스 메모리에서만 산다.
//   사이트별 · 업무별 고정 Workflow 가 아니다 — 매 요청마다 그 요청에서 새로 세운다(P3). 경험 · 후보는 이 조건을 강제하지 않는다.

/** 그 조건을 무엇으로 확인하는가 — observed: 실행이 화면에서 확인 · user: 사용자 확인이 필요(최종 확정 · 주관 판단 등). */
export type CriterionEvidenceKind = 'observed' | 'user';

export interface CompletionCriterion {
  /** c1..c4 */
  id: string;
  /** 짧은 조건 문장(예: "아모디핀정 5mg 의 성분 정보가 화면에 보인다"). */
  text: string;
  evidence: CriterionEvidenceKind;
}

export interface TaskUnderstanding {
  version: 1;
  /** ai = Assistant 이해 호출 · fallback = 결정적 기본 이해(요청 자체가 목표 · 조건 1개). */
  source: 'ai' | 'fallback';
  /** 사용자가 원하는 결과(한 문장). */
  goal: string;
  /** 결과 형태 — 정보 확인 · 화면 도달 · 변경(입력/등록 등 — 확정은 사용자). */
  outcome: 'information' | 'screen' | 'change';
  criteria: CompletionCriterion[];
  /** 요청에 없고 화면에서도 정할 수 없는 정보 — 실행 중 필요하면 그때 묻는다(미리 막지 않는다). */
  missing: { slot: string; question: string }[];
  /** 최종 제출 · 저장 · 결제 같은 확정 단계가 목표에 들어 있는가(있어도 확정은 언제나 사용자). */
  commitBoundary: boolean;
}

/** Execution 이 완료조건별로 돌려준 근거. grounded = 인용이 이번 run 에서 실제 읽은 화면 글에 있었는가. */
export interface ExecutionEvidence {
  criterionId: string;
  source: 'read' | 'screen';
  quote: string;
  grounded: boolean;
}

/** Execution 의 실행 비용 계측(조회 비교용 — 별도 분석 플랫폼 없음). */
export interface ExecutionMetrics {
  /** 이번 호출의 planner AI 호출 수 · 누적 시간. */
  aiCalls: number;
  aiMs: number;
  /** 실행 노드 왕복(명령) 수. */
  roundTrips: number;
  stepCount: number;
  totalMs: number;
}

/** Assistant 의 완료 판정. continue = 아직 조건 미충족 → 이유를 실행에 돌려준다 · ask = 사용자에게 묻는다. */
export interface CompletionVerdict {
  decision: 'complete' | 'continue' | 'ask';
  met: string[];
  unmet: string[];
  /** continue 일 때 planner 에 돌려줄 짧은 안내(조건 문장 기반 — 화면 글 없음). */
  note?: string;
  /** ask 일 때 질문 종류. */
  askKind?: 'success_confirmation' | 'value_confirmation';
}

/** Execution 이 완료를 주장할 때 Assistant 에 묻는 판정 hook. 없으면(직접 /work-agent/run) 종전 판정 그대로. */
export type CompletionJudge = (claim: { evidence: ExecutionEvidence[]; via: 'done' | 'goal_sufficiently_advanced' }) => Promise<CompletionVerdict>;

export interface ExecutionIntent {
  version: 1;
  /** 이 지시를 낸 Task(없으면 Task 저장이 실패한 실행 — 지시는 그대로 유효). */
  taskId: string | null;
  startMode: ExecutionStartMode;
  /** 같은 Task 를 이어갈 때 이전 run 이 남긴 provisional Task type — Execution 이 같은 키로 경험을 찾게 하는 힌트. 절차 선택 키가 아니다. */
  taskTypeHint: string | null;
  /**
   * Phase C — Assistant Memory: 같은 소유 주체(본인 USER Task 또는 그 조직의 ORGANIZATION Task) · 같은 대상에서 이전 Task 가
   * 확인한 업무 유형(Cloud · 실행 노드 무관). 새 노드에서도 같은 업무를 같은 키로 이어가 경험을 찾게 한다. 절차 선택 키가 아니다(P3).
   */
  knownTaskTypes: readonly string[];
  /**
   * Cloud Continuity — 소유 주체 전용 Assistant Memory 가 이번 Task 에 넘기는 근거(실행 노드 무관).
   *   patterns     같은 소유 주체 · 같은 대상의 검증된 방법(Task 키별). Execution 이 노드 원장과 합쳐 현재 화면으로 다시 검증한다.
   *   resumeFrame  재개하는 run 의 원래 업무 구조. 노드 원장에 없을 때(다른 PC)만 쓴다.
   * 둘 다 근거일 뿐 절차 강제가 아니다(P3). 값 · 원문 · 화면 글은 없다.
   */
  memory?: { patterns: readonly CloudRecalledPattern[]; resumeFrame: RunResumeFrame | null };
  /**
   * Phase D — Execution Node 조정(V2 §11-1). 노드 선택과 노드 원장 경계에 쓰는 구조만.
   *   ownerKey            이 Task 의 소유 주체를 가리키는 불투명 키(원 ID 아님). 노드 원장을 소유 주체별로 나눠 쓰게 한다.
   *   preferredDeviceIds  Assistant 가 우선하는 노드(같은 Task 의 이전 run 노드 등). 강제가 아니다 — online · capability 가 맞을 때만.
   */
  node?: { ownerKey: string | null; preferredDeviceIds: readonly string[] };
  evidence: readonly PlanningEvidence[];
  completion: CompletionContract;
  /** 실행 전 Assistant 의 업무 이해(목표 · 완료조건). 메모리 전용 — 로그 · 저장 금지. 없으면 종전(result_observed) 계약. */
  understanding?: TaskUnderstanding;
  /** 승인 경계(V2 §15). 최종 확정 · 결제 · 인증은 언제나 사용자. */
  approval: { commit: 'user_only'; credential: 'user_only' };
}

/** Execution 이 스스로 주장하는 실행 결과. Task 상태가 아니다. */
export type ExecutionClaim = 'execution_complete' | 'needs_user' | 'handed_over' | 'stopped' | 'not_started';

export interface ExecutionReport {
  claim: ExecutionClaim;
  /** logical run 이 열렸는가. */
  runOpened: boolean;
  /** 결과 화면에 닿았다는 실행 근거 — 행동 뒤 문서 이동 · 결과 읽기 성공 · 결정적 재생 완료 중 하나 이상. */
  resultObserved: boolean;
  /** 결정적 재생(Workflow Candidate)이 어긋남 없이 끝났는가. */
  replayVerified: boolean;
  /** 실행 중 실제로 쓴 역할(마지막). */
  plannerMode: 'discovery' | 'experienced';
  /** Execution 이 관찰한 provisional Task type(planner 선언) — Assistant 가 Task 에 올린다. */
  taskTypeProposal: string | null;
  /** Cloud Continuity — 이번 run 이 남긴 기억 후보(구조만). 저장 여부 · 위치는 Assistant 가 레지스트리로 정한다. */
  memory?: ExecutionMemoryReport;
  /** 마지막 완료 주장의 근거(완료조건별 인용 · 대조 결과). 메모리 전용 — 로그 · 저장 금지. */
  evidence?: ExecutionEvidence[];
  /** Assistant 가 이번 run 의 완료 주장을 판정했으면 그 결과(judge hook 이 있었을 때만). */
  verdict?: CompletionVerdict | null;
  /** 실행 비용 계측. */
  metrics?: ExecutionMetrics;
}

/**
 * Execution → Assistant 기억 후보. 서버가 이미 만든 구조화 도움 · 교정 이벤트에서 파생한 검증 방법과 재개 구조뿐이다.
 * 노드 원장을 read-back 한 것이 아니다. 값 · 원문 · 화면 글 · Provider 고유 값이 없다.
 */
export interface ExecutionMemoryReport {
  targetId: string | null;
  targetKind: 'browser_site' | 'windows_app' | null;
  taskKey: string | null;
  /** verified + reusable_knowledge 로 파생된 Preferred / Avoid(노드 규칙과 같음). */
  verifiedPatterns: readonly DerivedPattern[];
  /** 검증에 실패한 대안(기존 preferred 의 실패 횟수만 올린다). */
  failedAlternative: { stageKey: string; strategy: Strategy } | null;
  /** 질문으로 멈췄을 때만 — 다른 노드에서 이어갈 구조(label 없는 op). */
  resumeFrame: RunResumeFrame | null;
}
