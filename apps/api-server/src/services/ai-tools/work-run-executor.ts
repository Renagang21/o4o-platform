/**
 * Work Run local ledger executor — runtime → local agent `local.data.work_run_*` 발행 (PHASE 1)
 *
 * WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1
 *
 * runtime 이 logical Work Run 의 정본 상태를 **사용자 PC 의 Local SQLite** 에 기록하는 유일한 경로다.
 * 발행은 browser-dom-executor 와 동일한 issueCommand → awaitCommandResult → pickSafeResultData 왕복이며,
 * cloud 로 되돌아오는 것은 runId 반향 · 상태 enum · saved 플래그뿐이다(goal/note 원문은 통과하지 않는다).
 *
 * 이 executor 는 **cloud → local write** 만 한다. local run 내용을 cloud 로 read-back 하는 경로는 없다(§조건 4).
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import { LOCAL_AGENT_ACTIONS, pickSafeResultData } from '../local-agent/local-agent-protocol.js';
import { awaitCommandResult, issueCommand } from '../local-agent/local-agent-service.js';
import type { WorkRunStatus } from './work-run-coordination-service.js';

const WORK_RUN_TOOL = 'work.run.ledger';

export interface WorkRunLedgerResult {
  status: string;
  errorCode?: string;
  safe: Record<string, unknown>;
}

async function issue(
  dataSource: DataSource,
  userId: string,
  deviceId: string,
  action: string,
  args: Record<string, unknown>,
): Promise<WorkRunLedgerResult> {
  const startedAt = Date.now();
  const issued = await issueCommand(dataSource, { userId, deviceId, action, toolName: WORK_RUN_TOOL, args });
  if (issued.ok === false) {
    return { status: 'denied', errorCode: issued.errorCode, safe: {} };
  }
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeResultData(action, result.data);
  logger.info('local-agent work run ledger command', {
    tool: WORK_RUN_TOOL,
    action,
    runStatus: typeof safe.runStatus === 'string' ? safe.runStatus : null,
    status: result.status,
    errorCode: result.errorCode ?? null,
    durationMs: Date.now() - startedAt,
    deviceId,
  });
  return { status: result.status, errorCode: result.errorCode, safe };
}

/** logical run 생성/갱신(active/waiting_for_user). semantic 목표·대상·메모만 담는다. */
export async function issueWorkRunUpsert(
  dataSource: DataSource,
  ctx: { userId: string; deviceId: string },
  input: { runId: string; status: 'active' | 'waiting_for_user'; targetId?: string; goalSummary?: string; note?: string },
): Promise<WorkRunLedgerResult> {
  const args: Record<string, unknown> = { runId: input.runId, status: input.status };
  if (input.targetId !== undefined) args.targetId = input.targetId;
  if (input.goalSummary !== undefined) args.goalSummary = input.goalSummary;
  if (input.note !== undefined) args.note = input.note;
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_UPSERT, args);
}

/** logical run 상태 전이(complete/expire/taken_over/active/waiting_for_user). */
export async function issueWorkRunSetStatus(
  dataSource: DataSource,
  ctx: { userId: string; deviceId: string },
  input: { runId: string; status: WorkRunStatus; note?: string },
): Promise<WorkRunLedgerResult> {
  const args: Record<string, unknown> = { runId: input.runId, status: input.status };
  if (input.note !== undefined) args.note = input.note;
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_SET_STATUS, args);
}
