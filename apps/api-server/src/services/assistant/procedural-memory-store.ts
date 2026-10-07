/**
 * Assistant Memory Cloud store — `assistant_procedural_patterns` (M3 · M4) · `assistant_run_frames` (M5) (raw SQL · entity 없음)
 *
 * WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1
 * 정본: `docs/baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md` §4 · §5 · §9 · §10
 *
 * 불변식
 *   - **소유 주체 경계**(Boundary Guard Rule 1 · 3): 모든 읽기 · 쓰기는 USER = user_id · ORGANIZATION = organization_id 를 건다.
 *     다른 사용자 · 다른 조직의 기억은 이 경로로 오가지 않는다. 재개 구조는 run 의 user_id 를 함께 건다.
 *   - **구조만**: 받는 인자는 형식 키 · enum · op 목록(검증된 label)뿐이다. 값 · 원문 · 화면 글을 받는 칸이 없다.
 *     저장 직전에 다시 정규화한다(호출자를 믿지 않는다).
 *   - **신뢰 해제**: 마지막 사용 · 검증 후 1년 쓰이지 않은 방법은 recall 하지 않는다(정책 D2 · 물리 삭제와 구분).
 *   - Provider · 모델 고유 값이 없다(V2 §8-1-a) — 어느 수행자가 실행해도 같은 기억을 읽는다.
 */

import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import {
  ASSISTANCE_LIMITS,
  sanitizeAsk,
  sanitizeStageKey,
  sanitizeStrategy,
  sanitizeTaskKey,
  strategySignature,
  stripLabels,
  type CloudRecalledPattern,
  type DerivedPattern,
  type RunResumeFrame,
  type Strategy,
} from '../ai-tools/work-assistance.js';
import type { TaskUnderstanding } from '../ai-tools/work-agent-contract.js';
import { restoreUnderstanding } from './assistant-understanding.js';
import type { TaskOwnership } from './assistant-task-store.js';

/** 정책 D2 — 마지막 사용 · 검증 후 이 기간 쓰이지 않으면 근거로 쓰지 않는다. */
export const PROCEDURAL_MEMORY_UNUSED_EXPIRY_DAYS = 365;
/** 한 번에 Assistant 가 들고 가는 검증 방법 수(대상 하나 · 여러 Task type). */
export const PROCEDURAL_MEMORY_RECALL_LIMIT = 24;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARGET_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** 소유 주체 — Task 의 소유 범위를 따른다. 조직 기억에는 기여자를 남기지 않는다. */
export interface MemoryOwner { scope: 'USER' | 'ORGANIZATION'; ownerId: string }

export function memoryOwnerOf(userId: string, ownership: TaskOwnership): MemoryOwner | null {
  if (ownership.scope === 'ORGANIZATION') {
    return ownership.organizationId && UUID_RE.test(ownership.organizationId) ? { scope: 'ORGANIZATION', ownerId: ownership.organizationId } : null;
  }
  return UUID_RE.test(userId) ? { scope: 'USER', ownerId: userId } : null;
}

/** 칼럼 이름은 bind 할 수 없으므로 닫힌 상수표에서만 고른다(값은 언제나 $n bind). */
function ownerColumn(owner: MemoryOwner): 'user_id' | 'organization_id' {
  return owner.scope === 'ORGANIZATION' ? 'organization_id' : 'user_id';
}

/** 소유 범위별 부분 unique 인덱스(migration uq_app_user_pattern · uq_app_org_pattern)와 같은 conflict target. */
const PATTERN_CONFLICT_TARGET = Object.freeze({
  USER: `(user_id, target_id, task_type_key, stage_key, polarity, pattern_sig) WHERE ownership_scope = 'USER'`,
  ORGANIZATION: `(organization_id, target_id, task_type_key, stage_key, polarity, pattern_sig) WHERE ownership_scope = 'ORGANIZATION'`,
});

/** 방법 지문 — label 포함 서명의 sha256(고정 길이). */
export function patternSig(strategy: Strategy): string {
  return createHash('sha256').update(strategySignature(strategy)).digest('hex');
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as Record<string, unknown>[];
  return Array.isArray(result) ? (result as Record<string, unknown>[]) : [];
}

export interface PatternWriteInput {
  owner: MemoryOwner;
  targetId: string;
  taskKey: string;
  patterns: readonly DerivedPattern[];
}

/**
 * 검증된 방법을 소유 주체 기억에 더한다. 같은 방법이면 검증 횟수 + 마지막 사용 갱신, 반대 극성의 같은 방법은 retired
 * (새 검증이 이긴다 — 노드 규칙과 같음). 반환: 반영한 방법 수.
 */
export async function upsertVerifiedPatterns(dataSource: DataSource, input: PatternWriteInput): Promise<number> {
  const taskKey = sanitizeTaskKey(input.taskKey);
  if (!taskKey || !TARGET_ID_RE.test(input.targetId)) return 0;
  const col = ownerColumn(input.owner);
  let written = 0;
  for (const p of input.patterns.slice(0, ASSISTANCE_LIMITS.maxPatterns)) {
    const stageKey = sanitizeStageKey(p.stageKey);
    // avoid 는 op 순서만(노드와 같은 최소화) · preferred 는 검증된 label 까지.
    const strategy = sanitizeStrategy(p.polarity === 'avoid' ? stripLabels(p.strategy) : p.strategy);
    if (!stageKey || !strategy || (p.polarity !== 'preferred' && p.polarity !== 'avoid')) continue;
    const sig = patternSig(strategy);
    await dataSource.query(
      `INSERT INTO assistant_procedural_patterns
         (ownership_scope, ${col}, target_id, task_type_key, stage_key, polarity, pattern_sig, strategy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT ${PATTERN_CONFLICT_TARGET[input.owner.scope]}
       DO UPDATE SET verified_count = assistant_procedural_patterns.verified_count + 1,
                     status = 'verified', last_used_at = now(), updated_at = now()`,
      [input.owner.scope, input.owner.ownerId, input.targetId, taskKey, stageKey, p.polarity, sig, JSON.stringify(strategy)],
    );
    await dataSource.query(
      `UPDATE assistant_procedural_patterns SET status = 'retired', updated_at = now()
        WHERE ownership_scope = $1 AND ${col} = $2 AND target_id = $3 AND task_type_key = $4 AND stage_key = $5
          AND polarity = $6 AND pattern_sig = $7`,
      [input.owner.scope, input.owner.ownerId, input.targetId, taskKey, stageKey, p.polarity === 'preferred' ? 'avoid' : 'preferred', sig],
    );
    written += 1;
  }
  return written;
}

/** 검증에 실패한 대안이 기존 preferred 와 같으면 실패 횟수만 올린다. */
export async function recordFailedAlternative(
  dataSource: DataSource,
  input: { owner: MemoryOwner; targetId: string; taskKey: string; stageKey: string; strategy: Strategy },
): Promise<void> {
  const taskKey = sanitizeTaskKey(input.taskKey);
  const stageKey = sanitizeStageKey(input.stageKey);
  const strategy = sanitizeStrategy(input.strategy);
  if (!taskKey || !stageKey || !strategy || !TARGET_ID_RE.test(input.targetId)) return;
  const col = ownerColumn(input.owner);
  await dataSource.query(
    `UPDATE assistant_procedural_patterns SET failed_count = failed_count + 1, updated_at = now()
      WHERE ownership_scope = $1 AND ${col} = $2 AND target_id = $3 AND task_type_key = $4 AND stage_key = $5
        AND polarity = 'preferred' AND pattern_sig = $6`,
    [input.owner.scope, input.owner.ownerId, input.targetId, taskKey, stageKey, patternSig(strategy)],
  );
}

/**
 * 소유 주체 · 대상의 검증된 방법(여러 Task type). 1년 미사용은 제외(신뢰 해제). 돌려준 방법은 마지막 사용을 갱신한다
 * (Assistant 가 이번 판단의 근거로 실제로 넘긴 것 = 사용). 출처 run · 시각 · id 는 돌려주지 않는다.
 */
export async function readVerifiedPatterns(
  dataSource: DataSource,
  input: { owner: MemoryOwner; targetId: string },
): Promise<CloudRecalledPattern[]> {
  if (!TARGET_ID_RE.test(input.targetId)) return [];
  const col = ownerColumn(input.owner);
  const rows = rowsOf(
    await dataSource.query(
      `SELECT id, task_type_key, stage_key, polarity, strategy, verified_count
         FROM assistant_procedural_patterns
        WHERE ownership_scope = $1 AND ${col} = $2 AND target_id = $3 AND status = 'verified'
          AND last_used_at > now() - ($4 || ' days')::interval
        ORDER BY verified_count DESC, updated_at DESC
        LIMIT $5`,
      [input.owner.scope, input.owner.ownerId, input.targetId, String(PROCEDURAL_MEMORY_UNUSED_EXPIRY_DAYS), PROCEDURAL_MEMORY_RECALL_LIMIT],
    ),
  );
  const out: CloudRecalledPattern[] = [];
  const used: string[] = [];
  for (const r of rows) {
    const taskKey = sanitizeTaskKey(r.task_type_key);
    const stageKey = sanitizeStageKey(r.stage_key);
    const strategy = sanitizeStrategy(r.strategy);
    if (!taskKey || !stageKey || !strategy || (r.polarity !== 'preferred' && r.polarity !== 'avoid')) continue;
    const n = Number(r.verified_count);
    out.push({ taskKey, stageKey, polarity: r.polarity, strategy, verifiedCount: Number.isInteger(n) && n >= 0 ? Math.min(n, 10_000) : 0 });
    if (typeof r.id === 'string' && UUID_RE.test(r.id)) used.push(r.id);
  }
  if (used.length) {
    await dataSource.query(
      `UPDATE assistant_procedural_patterns SET last_used_at = now()
        WHERE ownership_scope = $1 AND ${col} = $2 AND id = ANY($3::uuid[])`,
      [input.owner.scope, input.owner.ownerId, used],
    );
  }
  return out;
}

// ─── M5 재개 구조 ─────────────────────────────────────────────────────────────

function normalizeFrame(f: RunResumeFrame): RunResumeFrame {
  return {
    taskKey: sanitizeTaskKey(f.taskKey),
    stageKey: sanitizeStageKey(f.stageKey),
    ask: f.ask ? sanitizeAsk(f.ask) : null,
    strategy: sanitizeStrategy(stripLabels(f.strategy)),
  };
}

/** 재개 구조가 비었는가(task · stage · 질문 · 방법 모두 없음) — 이해만 남긴 행이다. */
function isEmptyFrame(f: RunResumeFrame): boolean {
  return !f.taskKey && !f.stageKey && !f.ask && !f.strategy;
}

/**
 * 질문으로 멈춘 run 의 재개 구조를 남긴다. 요청자의 run(work_run_coordination.user_id)에만 붙는다 — 남의 run 이면 0 행.
 * 같은 사용자의 대기 중이 아닌 다른 run 의 재개 구조는 함께 지운다(종결 · 만료된 run 의 흔적이 남지 않게).
 * understanding — 그 run 의 업무 이해(목표 · 완료조건 · 확정 경계). 정책 M5 의 M10 예외: 질문 대기 동안만 · 행과 같은 수명.
 *   저장 직전에 다시 정규화한다(호출자를 믿지 않는다).
 */
export async function saveRunFrame(
  dataSource: DataSource,
  input: { runId: string; userId: string; taskId: string | null; targetId: string; frame: RunResumeFrame; understanding?: TaskUnderstanding | null },
): Promise<boolean> {
  if (!RUN_ID_RE.test(input.runId) || !UUID_RE.test(input.userId) || !TARGET_ID_RE.test(input.targetId)) return false;
  const f = normalizeFrame(input.frame);
  const understanding = input.understanding ? restoreUnderstanding(input.understanding) : null;
  const taskId = input.taskId && UUID_RE.test(input.taskId) ? input.taskId : null;
  const rows = rowsOf(
    await dataSource.query(
      `INSERT INTO assistant_run_frames (run_id, user_id, task_id, target_id, task_type_key, stage_key, ask, strategy, understanding)
       SELECT c.run_id, c.user_id, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb
         FROM work_run_coordination c
        WHERE c.run_id = $1 AND c.user_id = $2
       ON CONFLICT (run_id) DO UPDATE SET task_id = EXCLUDED.task_id, target_id = EXCLUDED.target_id,
         task_type_key = EXCLUDED.task_type_key, stage_key = EXCLUDED.stage_key, ask = EXCLUDED.ask,
         strategy = EXCLUDED.strategy, understanding = EXCLUDED.understanding, updated_at = now()
         WHERE assistant_run_frames.user_id = EXCLUDED.user_id
       RETURNING run_id`,
      [input.runId, input.userId, taskId, input.targetId, f.taskKey, f.stageKey,
        f.ask ? JSON.stringify(f.ask) : null, f.strategy ? JSON.stringify(f.strategy) : null,
        understanding ? JSON.stringify(understanding) : null],
    ),
  );
  await dataSource.query(
    `DELETE FROM assistant_run_frames f
      WHERE f.user_id = $1 AND f.run_id <> $2
        AND NOT EXISTS (SELECT 1 FROM work_run_coordination c
                         WHERE c.run_id = f.run_id AND c.user_id = $1 AND c.status = 'waiting_for_user')`,
    [input.userId, input.runId],
  );
  return rows.length > 0;
}

export interface StoredRunResume {
  /** 재개 구조 — 비어 있으면(이해만 남긴 행) null. */
  frame: RunResumeFrame | null;
  /** 그 run 의 업무 이해 — 없거나 형식이 맞지 않으면 null. */
  understanding: TaskUnderstanding | null;
}

/** 대기 중(만료 전)인 본인 run 의 재개 구조. 없거나 남의 run 이면 null. */
export async function readRunFrame(dataSource: DataSource, input: { runId: string; userId: string }): Promise<RunResumeFrame | null> {
  return (await readRunResume(dataSource, input))?.frame ?? null;
}

/** 대기 중(만료 전)인 본인 run 의 재개 구조와 업무 이해. 없거나 남의 run 이면 null. */
export async function readRunResume(dataSource: DataSource, input: { runId: string; userId: string }): Promise<StoredRunResume | null> {
  if (!RUN_ID_RE.test(input.runId) || !UUID_RE.test(input.userId)) return null;
  const rows = rowsOf(
    await dataSource.query(
      `SELECT f.task_type_key, f.stage_key, f.ask, f.strategy, f.understanding
         FROM assistant_run_frames f
         JOIN work_run_coordination c ON c.run_id = f.run_id AND c.user_id = f.user_id
        WHERE f.run_id = $1 AND f.user_id = $2 AND c.status = 'waiting_for_user' AND c.expires_at > now()`,
      [input.runId, input.userId],
    ),
  );
  if (!rows.length) return null;
  const r = rows[0];
  const frame = normalizeFrame({
    taskKey: r.task_type_key as string | null,
    stageKey: r.stage_key as string | null,
    ask: sanitizeAsk(r.ask),
    strategy: sanitizeStrategy(r.strategy),
  });
  return { frame: isEmptyFrame(frame) ? null : frame, understanding: restoreUnderstanding(r.understanding) };
}

/** run 이 질문 대기를 벗어나면(완료 · 인계 · 중지) 재개 구조를 지운다(정책 D2). */
export async function deleteRunFrame(dataSource: DataSource, input: { runId: string; userId: string }): Promise<void> {
  if (!RUN_ID_RE.test(input.runId) || !UUID_RE.test(input.userId)) return;
  await dataSource.query(`DELETE FROM assistant_run_frames WHERE run_id = $1 AND user_id = $2`, [input.runId, input.userId]);
}
