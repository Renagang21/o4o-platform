/**
 * Work Target 준비 명령 발행 (WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 §3·§33·§34·§35)
 *
 *   서버 → `local.target.prepare#<targetId>` → agent(확장·창 census) → TargetDiscoveryResult(안전 필드만)
 *
 * Work Agent 는 관찰·Planner 를 시작하기 **전에** 이것을 한 번 부른다. 준비되지 않은 대상에 대고 DOM inspect 를
 * 반복하지 않는다(§35). 인자는 없다 — URL · 경로 · 탭 · 창 제목을 서버가 지정하는 통로가 없다.
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import type { VerifiedToolContext } from './ai-tool-contract.js';
import { LOCAL_AGENT_ACTIONS, composeTargetAction, pickSafeTargetInfo } from '../local-agent/local-agent-protocol.js';
import { awaitCommandResult, issueCommand } from '../local-agent/local-agent-service.js';

export type WorkTargetState = 'not_found' | 'found' | 'active' | 'opening' | 'waiting_for_user' | 'ready' | 'failed';

/** Work Agent 결과에 실리는 대상 준비 요약(§33). 안전 whitelist 를 지난 값뿐이다. */
export interface WorkTargetOutcome {
  targetType: 'browser_site' | 'windows_app';
  targetId: string;
  displayName: string;
  state: WorkTargetState;
  reusedExisting: boolean;
  openedByO4O: boolean;
  userActionRequired: boolean;
  reason: string | null;
  errorCode: string | null;
  tabCount: number | null;
  windowCount: number | null;
}

export async function issueTargetPrepare(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  deviceId: string,
  tool: string,
  target: { targetType: 'browser_site' | 'windows_app'; targetId: string; displayName: string },
): Promise<WorkTargetOutcome> {
  const startedAt = Date.now();
  const base: WorkTargetOutcome = {
    targetType: target.targetType, targetId: target.targetId, displayName: target.displayName,
    state: 'failed', reusedExisting: false, openedByO4O: false, userActionRequired: false, reason: null, errorCode: null, tabCount: null, windowCount: null,
  };
  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId,
    action: composeTargetAction(LOCAL_AGENT_ACTIONS.TARGET_PREPARE, target.targetId),
    toolName: tool,
    args: undefined,
  });
  if (issued.ok === false) return { ...base, errorCode: issued.errorCode };
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeTargetInfo(result.data);
  const state = typeof safe.state === 'string' ? (safe.state as WorkTargetState) : 'failed';
  const outcome: WorkTargetOutcome = {
    ...base,
    state,
    reusedExisting: safe.reusedExisting === true,
    openedByO4O: safe.openedByO4O === true,
    userActionRequired: safe.userActionRequired === true || state === 'waiting_for_user',
    reason: typeof safe.reason === 'string' ? safe.reason : null,
    errorCode: result.errorCode ?? null,
    tabCount: typeof safe.tabCount === 'number' ? safe.tabCount : null,
    windowCount: typeof safe.windowCount === 'number' ? safe.windowCount : null,
  };
  // 로그는 대상 id · 종류 · 상태 · 사유 · 개수만(§46·§48). 탭 제목 · URL · 경로는 애초에 data 에 없다.
  logger.info('local-agent target prepare', {
    tool, targetId: target.targetId, targetType: target.targetType, state: outcome.state, reusedExisting: outcome.reusedExisting,
    openedByO4O: outcome.openedByO4O, reason: outcome.reason, status: result.status, errorCode: outcome.errorCode,
    tabCount: outcome.tabCount, windowCount: outcome.windowCount, durationMs: Date.now() - startedAt, deviceId,
  });
  return outcome;
}
