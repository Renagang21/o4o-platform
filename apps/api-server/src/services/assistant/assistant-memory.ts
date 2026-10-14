/**
 * O4O Personal Assistant — Assistant Memory (Phase C recall · Cloud Continuity)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1
 * WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1
 * 정본: V2 §9 (Ownership-first) · §17 (Compliance Gate) · §0-1 (P3) · 정책 `O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1` §4 · §9
 *
 * Assistant 가 Task 를 계획할 때 쓰는 기억을 **실행 노드와 무관하게** 모으고(recall), 실행이 끝나면 소유 주체 기억에 남긴다(remember).
 * 어느 PC · 채널에서 요청해도 같은 결과다.
 *
 *   종류                 위치     읽기                                   쓰기
 *   task_type_history    Cloud    같은 소유 주체 · 같은 대상의 업무 유형    (assistant_tasks 갱신으로)
 *   procedural_memory    Cloud    요청자 개인 · 같은 공개 대상의 검증 방법    이번 run 의 구조화 도움 · 교정에서 파생된 것만(요청자 개인)
 *   run_resume_frame     Cloud    재개하는 본인 run 의 원래 업무 구조         질문으로 멈추면 저장 · 그 밖 종결이면 삭제
 *   그 밖                노드     Execution 이 그 노드에서 현재 화면과 함께 읽는다
 *
 * 경계
 *   - 소유 주체 밖은 읽지도 쓰지도 않는다: USER Task → 요청자 본인 · ORGANIZATION Task → membership 으로 확정된 그 조직.
 *     다른 사용자 · 다른 조직의 기억은 이 경로로 오지 않는다(Shared 는 §10 경로 — 미구현).
 *   - P3(WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1): 방법 기억은 개인 교정 · 선호 · 회피에서 나오므로
 *     ORGANIZATION Task 여도 요청자 개인 기억으로만 읽고 쓴다 — 개인 규칙을 조직 실행 규칙으로 자동 승격하지 않는다.
 *     조직 공통 규칙은 명시적 조직 정책으로만 다룬다(채널 미구현 — Known Gap). 기존 조직 소유 행은 더 읽지도 쓰지도 않는다.
 *   - 구조만: 업무 키 · stage · op 목록(검증 label) · slot 종류. 절차를 정하지 않는다 — Execution 이 현재 화면으로 다시 검증한다(P3).
 *   - 사설 대상(Windows 앱 등)의 방법은 Cloud 에 두지 않는다(정책 §2-6 · M9).
 *   - 모든 Cloud 기억 접근은 `decideCloudPlacement` 를 먼저 통과한다.
 *   - 실패해도 업무 실행을 막지 않는다(빈 기억으로 진행 · 쓰기 실패는 로그만).
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import { TASK_KEY_RE, type CloudRecalledPattern, type RunResumeFrame } from '../ai-tools/work-assistance.js';
import type { ExecutionMemoryReport, TaskUnderstanding } from '../ai-tools/work-agent-contract.js';
import { isRegisteredBrowserSite } from '../local-agent/browser-site-registry.js';
import { decideCloudPlacement, isCloudProceduralTarget, type MemoryKind } from './memory-ownership.js';
import type { AssistantTaskStatus, TaskOwnership } from './assistant-task-store.js';
import {
  deleteRunFrame,
  memoryOwnerOf,
  readRunResume,
  readVerifiedPatterns,
  recordFailedAlternative,
  saveRunFrame,
  upsertVerifiedPatterns,
  type StoredRunResume,
} from './procedural-memory-store.js';

const TARGET_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const ASSISTANT_MEMORY_TASK_TYPE_LIMIT = 10;

export interface AssistantMemoryQuery {
  userId: string;
  ownership: TaskOwnership;
  /** 이번 Task 의 대상(등재 site · 앱 id). 없으면 대상별 기억을 찾지 않는다. */
  targetId: string | null;
  /** 재개하는 run(있을 때만 재개 구조를 찾는다). */
  runId?: string | null;
}

export type MemorySourceNote = 'NO_TARGET' | 'READ_FAILED' | 'PRIVATE_TARGET' | 'NOT_RESUMING' | 'NODE_RESIDENT';

export interface MemorySourceReport {
  kind: MemoryKind;
  placement: 'cloud' | 'node';
  /** Assistant 가 이 출처를 이번 판단에 실제로 읽었는가. node 출처는 Execution 이 그 노드에서 읽는다. */
  readByAssistant: boolean;
  /** 읽지 않은 이유(있을 때). */
  note?: MemorySourceNote;
}

export interface AssistantMemory {
  /** 같은 소유 주체 · 같은 대상에서 확인된 업무 유형(최근순 · 구조 키만). */
  knownTaskTypes: string[];
  /** 같은 소유 주체 · 같은 공개 대상의 검증된 방법(Task 키별 · 근거일 뿐 강제 아님). */
  patterns: CloudRecalledPattern[];
  /** 재개하는 run 의 원래 업무 구조(다른 노드에서 이어가기용). */
  resumeFrame: RunResumeFrame | null;
  /** 재개하는 run 의 원래 업무 이해(목표 · 완료조건 · 확정 경계) — 다른 API 인스턴스에서 이어가도 원래 조건으로 판정한다. */
  understanding: TaskUnderstanding | null;
  sources: MemorySourceReport[];
}

export const EMPTY_ASSISTANT_MEMORY: AssistantMemory = Object.freeze({
  knownTaskTypes: [], patterns: [], resumeFrame: null, understanding: null, sources: [],
}) as AssistantMemory;

async function readTaskTypeHistory(dataSource: DataSource, q: AssistantMemoryQuery): Promise<string[]> {
  const params: unknown[] = [];
  let boundary: string;
  if (q.ownership.scope === 'ORGANIZATION' && q.ownership.organizationId) {
    params.push(q.ownership.organizationId);
    boundary = `organization_id = $1 AND ownership_scope = 'ORGANIZATION'`;
  } else {
    params.push(q.userId);
    boundary = `requested_by_user_id = $1 AND ownership_scope = 'USER'`;
  }
  params.push(q.targetId, ASSISTANT_MEMORY_TASK_TYPE_LIMIT);
  const rows: { task_type_key: string }[] = await dataSource.query(
    `SELECT task_type_key
       FROM assistant_tasks
      WHERE ${boundary} AND target_id = $2 AND task_type_key IS NOT NULL
      GROUP BY task_type_key
      ORDER BY MAX(updated_at) DESC
      LIMIT $3`,
    params,
  );
  return (rows ?? []).map((r) => r.task_type_key).filter((k) => typeof k === 'string' && TASK_KEY_RE.test(k));
}

/** P3 — 방법 기억의 소유 주체는 언제나 요청자 개인이다(Task 소유 범위와 무관). */
function personalMemoryOwner(userId: string) {
  return memoryOwnerOf(userId, { scope: 'USER', organizationId: null, serviceKey: null });
}

/** 한 출처를 읽는다 — 실패는 빈 값 + READ_FAILED(업무를 막지 않는다). */
async function readSource<T>(kind: MemoryKind, empty: T, read: () => Promise<T>, sources: MemorySourceReport[]): Promise<T> {
  try {
    const v = await read();
    sources.push({ kind, placement: 'cloud', readByAssistant: true });
    return v;
  } catch (err) {
    logger.warn('assistant memory recall failed', { kind, error: err instanceof Error ? err.name : 'unknown' });
    sources.push({ kind, placement: 'cloud', readByAssistant: false, note: 'READ_FAILED' });
    return empty;
  }
}

export async function recallAssistantMemory(dataSource: DataSource, q: AssistantMemoryQuery): Promise<AssistantMemory> {
  const sources: MemorySourceReport[] = [];
  const hasTarget = !!q.targetId && TARGET_ID_RE.test(q.targetId);
  // P3 — 검증된 방법(개인 교정 · 선호 · 회피에서 온다)은 요청자 개인 기억에서만 읽는다. 조직 Task 여도 같다.
  const owner = personalMemoryOwner(q.userId);

  // ── 업무 유형 이력 ──
  let knownTaskTypes: string[] = [];
  if (decideCloudPlacement('task_type_history').ok) {
    if (!hasTarget) sources.push({ kind: 'task_type_history', placement: 'cloud', readByAssistant: false, note: 'NO_TARGET' });
    else knownTaskTypes = await readSource('task_type_history', [] as string[], () => readTaskTypeHistory(dataSource, q), sources);
  }

  // ── 검증된 방법(M3 · M4) — 공개 대상만 ──
  let patterns: CloudRecalledPattern[] = [];
  if (decideCloudPlacement('procedural_memory').ok) {
    if (!hasTarget || !owner) sources.push({ kind: 'procedural_memory', placement: 'cloud', readByAssistant: false, note: 'NO_TARGET' });
    else if (!isCloudProceduralTarget(isRegisteredBrowserSite(q.targetId) ? 'browser_site' : null)) {
      sources.push({ kind: 'procedural_memory', placement: 'node', readByAssistant: false, note: 'PRIVATE_TARGET' });
    } else {
      patterns = await readSource('procedural_memory', [] as CloudRecalledPattern[],
        () => readVerifiedPatterns(dataSource, { owner, targetId: q.targetId as string }), sources);
    }
  }

  // ── 재개 구조(M5) — 재개할 때만 · 본인 run 만 ──
  let resumeFrame: RunResumeFrame | null = null;
  let understanding: TaskUnderstanding | null = null;
  if (decideCloudPlacement('run_resume_frame').ok) {
    if (!q.runId) sources.push({ kind: 'run_resume_frame', placement: 'cloud', readByAssistant: false, note: 'NOT_RESUMING' });
    else {
      const stored = await readSource('run_resume_frame', null as StoredRunResume | null,
        () => readRunResume(dataSource, { runId: q.runId as string, userId: q.userId }), sources);
      resumeFrame = stored?.frame ?? null;
      understanding = stored?.understanding ?? null;
    }
  }

  // 원 기록(구조화 도움 · 교정 · 실행 단계)은 노드에 남는다 — Execution 이 그 노드에서 읽는다.
  sources.push({ kind: 'assistant_experience', placement: 'node', readByAssistant: false, note: 'NODE_RESIDENT' });

  return { knownTaskTypes, patterns, resumeFrame, understanding, sources };
}

export interface RememberInput {
  userId: string;
  taskId: string | null;
  ownership: TaskOwnership;
  runId: string | null;
  /** Assistant 가 판정한 Task 상태 — 재개 구조의 수명을 정한다. */
  taskStatus: AssistantTaskStatus;
  memory: ExecutionMemoryReport | undefined;
  /** 이번 Task 의 업무 이해 — 질문 대기면 재개 구조와 함께 남긴다(다른 인스턴스 재개용 · 정책 M5 의 M10 예외). */
  understanding?: TaskUnderstanding | null;
  /** 실행이 재개 대상을 보고하지 않았을 때 쓸 대상(응답의 target). */
  fallbackTargetId?: string | null;
}

export interface RememberOutcome {
  patternsWritten: number;
  failedRecorded: boolean;
  frame: 'saved' | 'deleted' | 'none';
}

/**
 * 실행이 남긴 기억 후보를 소유 주체 기억에 반영한다.
 *   - 검증된 방법: 공개 대상 + 레지스트리 허용일 때만 · 소유 주체 = Task 소유 범위.
 *   - 재개 구조: Task 가 질문 대기(waiting_for_user)면 저장, 그 밖이면 그 run 의 재개 구조를 지운다(정책 D2).
 * 실패는 로그만 — 업무 결과를 바꾸지 않는다.
 */
export async function rememberExecution(dataSource: DataSource, input: RememberInput): Promise<RememberOutcome> {
  const out: RememberOutcome = { patternsWritten: 0, failedRecorded: false, frame: 'none' };
  const m = input.memory;
  // P3 — 검증된 방법 · 실패 대안은 요청자 개인 기억으로만 쓴다. 개인의 Correction/Preferred/Avoid 를 조직 기억으로 자동 승격하지 않는다
  // (조직 공통 규칙은 명시적 조직 정책으로만 — 아직 채널 없음).
  const owner = personalMemoryOwner(input.userId);

  if (m && owner && m.targetId && m.taskKey && isCloudProceduralTarget(m.targetKind) && decideCloudPlacement('procedural_memory').ok) {
    try {
      if (m.verifiedPatterns.length) {
        out.patternsWritten = await upsertVerifiedPatterns(dataSource, { owner, targetId: m.targetId, taskKey: m.taskKey, patterns: m.verifiedPatterns });
      }
      if (m.failedAlternative) {
        await recordFailedAlternative(dataSource, { owner, targetId: m.targetId, taskKey: m.taskKey, ...m.failedAlternative });
        out.failedRecorded = true;
      }
    } catch (err) {
      logger.warn('assistant memory write failed', { kind: 'procedural_memory', error: err instanceof Error ? err.name : 'unknown' });
    }
  }

  if (input.runId && decideCloudPlacement('run_resume_frame').ok) {
    try {
      // 질문 대기면 재개 구조 · 업무 이해를 남긴다. 구조가 없어도(예: 성공 확인 질문) 이해가 있으면 남긴다 —
      // 재개가 다른 인스턴스에 닿아도 원래 완료조건으로 판정하게.
      const frameTarget = m?.targetId ?? input.fallbackTargetId ?? null;
      if (input.taskStatus === 'waiting_for_user' && frameTarget && (m?.resumeFrame || input.understanding)) {
        const saved = await saveRunFrame(dataSource, {
          runId: input.runId, userId: input.userId, taskId: input.taskId, targetId: frameTarget,
          frame: m?.resumeFrame ?? { taskKey: null, stageKey: null, ask: null, strategy: null },
          understanding: input.understanding ?? null,
        });
        out.frame = saved ? 'saved' : 'none';
      } else {
        await deleteRunFrame(dataSource, { runId: input.runId, userId: input.userId });
        out.frame = 'deleted';
      }
    } catch (err) {
      logger.warn('assistant memory write failed', { kind: 'run_resume_frame', error: err instanceof Error ? err.name : 'unknown' });
    }
  }
  return out;
}
