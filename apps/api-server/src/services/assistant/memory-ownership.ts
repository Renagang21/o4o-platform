/**
 * O4O Personal Assistant — Memory Ownership / Placement 레지스트리 (Phase C · Cloud Continuity)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1
 * WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1 — 배치 판정을 정책 §4 에 맞추고 Gate 를 Compliance Gate 로 재정의
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §9 (Ownership-first) · §17 (Compliance Gate)
 *       `docs/baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md` §2 · §4
 *
 * 기억은 실행 위치가 아니라 의미의 소유 주체에 귀속된다(§9-1). 저장 위치는 ① 소유 주체 ② 어디서 필요한가
 * ③ 설계 경계(정책 §2 · §10)가 허용하는가 로 정한다. 이 레지스트리는 그 판단을 코드로 고정한다:
 *
 *   cloudPlacement
 *     'allowed'  — 소유 주체 전용 Cloud 에 둔다. Assistant 가 어느 노드에서든 읽는다.
 *     'node'     — 실행 노드에 남긴다(최소화 · 정책 §2-1). Cloud 로 옮기지 않는다.
 *     'never'    — 실행환경 상태 또는 DO_NOT_STORE. 어떤 경우에도 Assistant Memory 가 되지 않는다.
 *
 * Compliance Gate(V2 §17) 는 **개발을 막는 조건이 아니다.** 정식 운영 · 실사용 확대 전에 그 시점의 법령 · 실제 데이터 흐름 ·
 * 실제 Provider · 실제 계약으로 점검하는 항목이다. `complianceReview: true` 인 종류가 그 점검 대상 목록이고,
 * `COMPLIANCE_GATE` 는 그 점검의 진행 상태를 기록할 뿐 배치 판정을 바꾸지 않는다.
 * 대신 설계 경계(구조만 · 소유 주체 경계 · 삭제 가능 · Provider 독립 · 인증정보 금지)는 지금도 코드가 강제한다.
 */

export type MemoryOwner = 'organization_or_user' | 'user' | 'run' | 'node' | 'none';
export type MemoryPlacementNow = 'cloud' | 'node' | 'nowhere';
export type CloudPlacement = 'allowed' | 'node' | 'never';

/** V2 §17 Compliance Gate — 실사용 확대 전 점검 상태. 배치 판정에 쓰지 않는다(개발 차단 조건 아님). */
export const COMPLIANCE_GATE = 'PENDING' as 'PENDING' | 'PASSED';

export interface MemoryKindSpec {
  owner: MemoryOwner;
  /** 지금 실제로 있는 곳. */
  placementNow: MemoryPlacementNow;
  cloudPlacement: CloudPlacement;
  /** 실사용 확대 전 Compliance Gate 점검 대상(처리방침 · 보유기간 · 고지 반영 필요). */
  complianceReview: boolean;
  /** 정본 근거 한 줄. */
  basis: string;
}

/**
 * 기억 종류 전수. 새 종류는 여기에 먼저 등록한다 — 등록되지 않은 종류는 Cloud 배치 판정에서 거절된다.
 * organization_or_user = Task 의 소유 범위(USER / ORGANIZATION)를 따른다. 소유 범위는 기억의 경계일 뿐 절차를 고르는 기준이 아니다(V2 §0-1-6).
 */
export const MEMORY_KINDS = Object.freeze({
  // ── 소유 주체 전용 Cloud ──
  assistant_task: {
    owner: 'organization_or_user', placementNow: 'cloud', cloudPlacement: 'allowed', complianceReview: true,
    basis: '정책 M1 · V2 §4 — assistant_tasks (구조 식별자 · 상태만)',
  },
  task_type_history: {
    owner: 'organization_or_user', placementNow: 'cloud', cloudPlacement: 'allowed', complianceReview: true,
    basis: '정책 M2 — assistant_tasks.task_type_key 의 읽기',
  },
  procedural_memory: {
    owner: 'organization_or_user', placementNow: 'cloud', cloudPlacement: 'allowed', complianceReview: true,
    basis: '정책 M3 · M4 — 검증된 Preferred/Avoid(공개 사이트 대상만 · 사설 대상은 노드 M9) · assistant_procedural_patterns',
  },
  run_resume_frame: {
    owner: 'run', placementNow: 'cloud', cloudPlacement: 'allowed', complianceReview: true,
    basis: '정책 M5 — 질문으로 멈춘 run 의 task · stage · slot 종류 · label 없는 op · run 종결 시 삭제 · assistant_run_frames',
  },
  // ── 노드에 남는다 (최소화) ──
  assistant_experience: {
    owner: 'user', placementNow: 'node', cloudPlacement: 'node', complianceReview: false,
    basis: '정책 M7 — 구조화 도움 · 교정 원장. Cloud 에는 여기서 파생된 검증 방법(M3)만 간다',
  },
  execution_experience: {
    owner: 'organization_or_user', placementNow: 'node', cloudPlacement: 'node', complianceReview: false,
    basis: '정책 M8 — 단계 · semantic locator · 실패 층 · 시간 분해',
  },
  // ── 어떤 경우에도 Assistant Memory 가 아님 ──
  request_summary: {
    owner: 'user', placementNow: 'node', cloudPlacement: 'never', complianceReview: false,
    basis: '정책 M10 — 요청 원문 요약은 Assistant Memory 가 아니다(노드 goal_summary 축소는 별도)',
  },
  slot_values: {
    owner: 'run', placementNow: 'node', cloudPlacement: 'never', complianceReview: false,
    basis: 'D3 — Run 종료 시 삭제',
  },
  node_environment: {
    owner: 'node', placementNow: 'node', cloudPlacement: 'never', complianceReview: false,
    basis: 'V2 §9-2 node — credential · 로그인 세션 · 현재 화면 · 로컬 파일 경로 · PC 이름 · 로컬 데이터 소스 바인딩',
  },
  raw_content: {
    owner: 'none', placementNow: 'nowhere', cloudPlacement: 'never', complianceReview: false,
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

/** 실사용 확대 전 Compliance Gate 점검 대상 종류. */
export function complianceReviewKinds(): MemoryKind[] {
  return (Object.keys(MEMORY_KINDS) as MemoryKind[]).filter((k) => MEMORY_KINDS[k].complianceReview);
}

/**
 * 절차 기억(M3 · M4)을 Cloud 에 둘 수 있는 대상 — 등재된 공개 HTTPS 사이트(browser_site)만.
 * Windows 앱 · 사내 프로그램 같은 사설 대상의 화면 구조는 노드에 둔다(정책 §2-6 · M9 · §10).
 */
export function isCloudProceduralTarget(targetKind: unknown): boolean {
  return targetKind === 'browser_site';
}

export type CloudPlacementDecision =
  | { ok: true; kind: MemoryKind }
  | { ok: false; kind: string; reason: 'UNREGISTERED_KIND' | 'NODE_ONLY' | 'NODE_RESIDENT' };

/**
 * Cloud 에 이 종류의 기억을 쓰거나 읽어 Assistant 판단에 쓸 수 있는가.
 * Assistant Memory 를 Cloud 에서 다루는 모든 경로는 이 판정을 먼저 거친다. Compliance Gate 상태는 판정에 들어가지 않는다.
 */
export function decideCloudPlacement(kind: string): CloudPlacementDecision {
  if (!isMemoryKind(kind)) return { ok: false, kind, reason: 'UNREGISTERED_KIND' };
  const spec = MEMORY_KINDS[kind];
  if (spec.cloudPlacement === 'never') return { ok: false, kind, reason: 'NODE_ONLY' };
  if (spec.cloudPlacement === 'node') return { ok: false, kind, reason: 'NODE_RESIDENT' };
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
