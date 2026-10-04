/**
 * O4O Personal Assistant — Memory Ownership / Placement 레지스트리 (Phase C)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §9 (Ownership-first) · §17 (Legal / Data Processing Gate)
 *       `docs/baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md` §15 · §16
 *
 * 기억은 실행 위치가 아니라 의미의 소유 주체에 귀속된다(§9-1). 저장 위치는 ① 소유 주체 ② 어디서 필요한가
 * ③ 경계 정책(§16 · §17)이 허용하는가 로 정한다. 이 레지스트리는 그 판단을 코드로 고정한다:
 *
 *   cloudPlacement
 *     'allowed'        — 이미 승인된 Cloud 저장(Phase A Task 등). Assistant 가 어느 노드에서든 읽는다.
 *     'gate_required'  — 소유 주체는 Cloud 쪽(organization · user · run)이지만, `local.db` 밖으로 옮기는 것은
 *                        §17 Gate 통과 후에만 한다(§9-4). 그 전까지 실행 노드에 남는다.
 *     'never'          — 실행환경 상태(node) 또는 DO_NOT_STORE. 어떤 경우에도 Assistant Memory 가 되지 않는다.
 *
 * Gate 통과는 사용자(저장소 소유자) 승인 + 보유기간 · 처리방침 결정이 필요하다(§17-1). 코드가 스스로 열지 않는다 —
 * `LEGAL_DATA_PROCESSING_GATE` 를 바꾸는 것은 Gate 통과를 기록하는 명시 WO 의 일이다.
 */

export type MemoryOwner = 'organization_or_user' | 'user' | 'run' | 'node' | 'none';
export type MemoryPlacementNow = 'cloud' | 'node' | 'nowhere';
export type CloudPlacement = 'allowed' | 'gate_required' | 'never';

/** §17 Gate 상태. 통과 전에는 gate_required 종류를 Cloud 에 쓰거나 옮기지 않는다. */
export const LEGAL_DATA_PROCESSING_GATE = 'PENDING' as 'PENDING' | 'PASSED';

export interface MemoryKindSpec {
  owner: MemoryOwner;
  /** 지금 실제로 있는 곳. */
  placementNow: MemoryPlacementNow;
  cloudPlacement: CloudPlacement;
  /** 정본 근거 한 줄. */
  basis: string;
}

/**
 * 기억 종류 전수. 새 종류는 여기에 먼저 등록한다 — 등록되지 않은 종류는 Cloud 배치 판정에서 거절된다.
 * organization_or_user = Task 의 소유 범위(USER / ORGANIZATION)를 따른다. 소유 범위는 기억의 경계일 뿐 절차를 고르는 기준이 아니다(V2 §0-1-6).
 */
export const MEMORY_KINDS = Object.freeze({
  // ── 이미 Cloud (Phase A 승인 구조) ──
  assistant_task: {
    owner: 'organization_or_user', placementNow: 'cloud', cloudPlacement: 'allowed',
    basis: 'V2 §4 · §18-2 A — assistant_tasks (구조 식별자 · 상태만)',
  },
  task_type_history: {
    owner: 'organization_or_user', placementNow: 'cloud', cloudPlacement: 'allowed',
    basis: 'assistant_tasks.task_type_key 의 읽기 — 새 저장 · 새 외부 처리 아님 (보유기간은 §17-3 Gate 항목)',
  },
  // ── 소유는 Cloud 쪽, 이동은 Gate 뒤 (§9-4) ──
  procedural_memory: {
    owner: 'organization_or_user', placementNow: 'node', cloudPlacement: 'gate_required',
    basis: 'V2 §6-1 · §9-2 — stage 경로 · Preferred/Avoid · Workflow Candidate',
  },
  assistant_experience: {
    owner: 'user', placementNow: 'node', cloudPlacement: 'gate_required',
    basis: 'V2 §6-1 · §9-2 — 구조화된 도움 · 교정 · 개인 선호 (원문 DO_NOT_STORE)',
  },
  execution_experience: {
    owner: 'organization_or_user', placementNow: 'node', cloudPlacement: 'gate_required',
    basis: 'V2 §6-1 — 단계 · semantic locator · 실패 층 · 시간 분해 (Procedural Memory 에 종속)',
  },
  run_resume_frame: {
    owner: 'run', placementNow: 'node', cloudPlacement: 'gate_required',
    basis: 'V2 §9-2 run — task · stage · slot 종류 · 전략 (다른 노드 재개를 위해 run 을 따라가야 함)',
  },
  request_summary: {
    owner: 'user', placementNow: 'node', cloudPlacement: 'gate_required',
    basis: 'EXP §15 goal_summary LOCAL_ONLY(=소유 주체 전용) · V2 §17-3 무기한 보관 어긋남',
  },
  // ── 어떤 경우에도 Assistant Memory 가 아님 ──
  slot_values: {
    owner: 'run', placementNow: 'node', cloudPlacement: 'never',
    basis: 'D3 — Run 종료 시 삭제',
  },
  node_environment: {
    owner: 'node', placementNow: 'node', cloudPlacement: 'never',
    basis: 'V2 §9-2 node — credential · 로그인 세션 · 현재 화면 · 로컬 파일 경로 · PC 이름 · 로컬 데이터 소스 바인딩',
  },
  raw_content: {
    owner: 'none', placementNow: 'nowhere', cloudPlacement: 'never',
    basis: 'V2 §9-3 DO_NOT_STORE — 도움/교정 원문 · 화면 텍스트 · screenshot · prompt · 비밀번호 · OTP · 환자/고객 정보',
  },
} satisfies Record<string, MemoryKindSpec>);

export type MemoryKind = keyof typeof MEMORY_KINDS;

export function isMemoryKind(v: unknown): v is MemoryKind {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MEMORY_KINDS, v);
}

/** 실행환경(node)에 속하거나 저장 금지인 종류 — Assistant Memory 로 승격하지 않는다. */
export function isNodeOnly(kind: MemoryKind): boolean {
  return MEMORY_KINDS[kind].cloudPlacement === 'never';
}

export type CloudPlacementDecision =
  | { ok: true; kind: MemoryKind }
  | { ok: false; kind: string; reason: 'UNREGISTERED_KIND' | 'NODE_ONLY' | 'LEGAL_GATE_PENDING' };

/**
 * Cloud 에 이 종류의 기억을 쓰거나 읽어 Assistant 판단에 쓸 수 있는가.
 * Assistant Memory 를 Cloud 에서 다루는 모든 경로는 이 판정을 먼저 거친다.
 */
export function decideCloudPlacement(kind: string, gate: typeof LEGAL_DATA_PROCESSING_GATE = LEGAL_DATA_PROCESSING_GATE): CloudPlacementDecision {
  if (!isMemoryKind(kind)) return { ok: false, kind, reason: 'UNREGISTERED_KIND' };
  const spec = MEMORY_KINDS[kind];
  if (spec.cloudPlacement === 'never') return { ok: false, kind, reason: 'NODE_ONLY' };
  if (spec.cloudPlacement === 'gate_required' && gate !== 'PASSED') return { ok: false, kind, reason: 'LEGAL_GATE_PENDING' };
  return { ok: true, kind };
}

export function assertCloudPlacement(kind: string): asserts kind is MemoryKind {
  const d = decideCloudPlacement(kind);
  if (d.ok === false) {
    // strictNullChecks off — 판별 union 의 negation narrowing 이 안 먹으므로 reason 은 좁은 캐스트로 읽는다.
    const reason = (d as { reason: string }).reason;
    const err = new Error(`ASSISTANT_MEMORY_PLACEMENT_REJECTED:${reason}`);
    (err as Error & { code?: string }).code = reason;
    throw err;
  }
}
