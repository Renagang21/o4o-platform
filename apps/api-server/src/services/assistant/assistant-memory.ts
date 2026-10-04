/**
 * O4O Personal Assistant — Assistant Memory recall (Phase C)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1
 * 정본: V2 §9 (Ownership-first) · §17 (Gate) · §0-1 (P3)
 *
 * Assistant 가 Task 를 계획할 때 쓰는 기억을 **실행 노드와 무관하게** 모은다. 어느 PC · 채널에서 요청해도 같은 결과다.
 *
 *   출처                      위치     지금
 *   task_type_history         Cloud    읽는다 — 같은 소유 주체 · 같은 대상에서 이전 Task 가 확인한 업무 유형
 *   procedural_memory 등      노드      Gate 전 — Execution 이 그 노드에서 현재 화면과 함께 읽는다(근거 목록에 node 로 표시)
 *
 * 경계
 *   - 소유 주체 밖은 읽지 않는다: USER Task → 요청자 본인의 USER Task 만, ORGANIZATION Task → 그 조직(membership 으로 확정된)의
 *     ORGANIZATION Task 만. 다른 사용자 · 다른 조직의 기억은 이 경로로 오지 않는다(Shared 는 §10 경로 — 미구현).
 *   - 업무 유형 이름만 돌려준다. 절차 · 값 · 원문은 없다 — 이 기억은 같은 업무를 같은 키로 이어가게 할 뿐 절차를 정하지 않는다(P3).
 *   - 모든 Cloud 기억 접근은 `decideCloudPlacement` 를 먼저 통과한다.
 *   - 실패해도 업무 실행을 막지 않는다(빈 기억으로 진행).
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import { TASK_KEY_RE } from '../ai-tools/work-assistance.js';
import { decideCloudPlacement, type MemoryKind } from './memory-ownership.js';
import type { TaskOwnership } from './assistant-task-store.js';

const TARGET_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const ASSISTANT_MEMORY_TASK_TYPE_LIMIT = 10;

export interface AssistantMemoryQuery {
  userId: string;
  ownership: TaskOwnership;
  /** 이번 Task 의 대상(등재 site · 앱 id). 없으면 대상별 기억을 찾지 않는다. */
  targetId: string | null;
}

export interface MemorySourceReport {
  kind: MemoryKind;
  placement: 'cloud' | 'node';
  /** Assistant 가 이 출처를 이번 판단에 실제로 읽었는가. node 출처는 Execution 이 그 노드에서 읽는다. */
  readByAssistant: boolean;
  /** 읽지 않은 이유(있을 때). */
  note?: 'LEGAL_GATE_PENDING' | 'NO_TARGET' | 'READ_FAILED';
}

export interface AssistantMemory {
  /** 같은 소유 주체 · 같은 대상에서 확인된 업무 유형(최근순 · 구조 키만). */
  knownTaskTypes: string[];
  sources: MemorySourceReport[];
}

export const EMPTY_ASSISTANT_MEMORY: AssistantMemory = Object.freeze({ knownTaskTypes: [], sources: [] }) as AssistantMemory;

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

export async function recallAssistantMemory(dataSource: DataSource, q: AssistantMemoryQuery): Promise<AssistantMemory> {
  const sources: MemorySourceReport[] = [];
  let knownTaskTypes: string[] = [];

  const history = decideCloudPlacement('task_type_history');
  if (!history.ok) {
    sources.push({ kind: 'task_type_history', placement: 'cloud', readByAssistant: false, note: 'LEGAL_GATE_PENDING' });
  } else if (!q.targetId || !TARGET_ID_RE.test(q.targetId)) {
    sources.push({ kind: 'task_type_history', placement: 'cloud', readByAssistant: false, note: 'NO_TARGET' });
  } else {
    try {
      knownTaskTypes = await readTaskTypeHistory(dataSource, q);
      sources.push({ kind: 'task_type_history', placement: 'cloud', readByAssistant: true });
    } catch (err) {
      logger.warn('assistant memory recall failed', { kind: 'task_type_history', error: err instanceof Error ? err.name : 'unknown' });
      sources.push({ kind: 'task_type_history', placement: 'cloud', readByAssistant: false, note: 'READ_FAILED' });
    }
  }

  // 절차 기억(Preferred/Avoid · Candidate) — 소유는 Cloud 쪽이지만 Gate 전이라 노드에 있다. Execution 이 노드에서 읽는다.
  const procedural = decideCloudPlacement('procedural_memory');
  sources.push({
    kind: 'procedural_memory',
    placement: procedural.ok ? 'cloud' : 'node',
    readByAssistant: false,
    ...(procedural.ok ? {} : { note: 'LEGAL_GATE_PENDING' as const }),
  });

  return { knownTaskTypes, sources };
}
