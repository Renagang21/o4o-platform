/**
 * Windows UIA 명령 발행 (WO-O4O-WINDOWS-UI-AUTOMATION-V0)
 *
 *   서버 → `local.uia.<x>#<appId>` → agent(UIA 스크립트) → 안전 whitelist(pickSafeUiaInfo) → Work Agent
 *
 * browser-dom-executor 와 같은 자리다. 결과에 남는 것은 whitelist 를 지난 필드뿐이고 로그는 tool · appId · action · role ·
 * riskLevel · status · code · 시간이다(요소 이름 · 값 · 창 제목은 로그에 없다).
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import type { VerifiedToolContext } from './ai-tool-contract.js';
import { composeAppAction } from '../local-agent/local-agent-protocol.js';
import { awaitCommandResult, issueCommand } from '../local-agent/local-agent-service.js';
import { pickSafeUiaInfo } from '../local-agent/windows-uia-contract.js';

export async function issueUiaCommand(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  deviceId: string,
  tool: string,
  baseAction: string,
  appId: string,
  args: Record<string, unknown> | undefined,
): Promise<{ status: string; errorCode?: string; safe: Record<string, unknown> }> {
  const startedAt = Date.now();
  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId,
    action: composeAppAction(baseAction, appId),
    toolName: tool,
    args,
  });
  if (issued.ok === false) return { status: 'denied', errorCode: issued.errorCode, safe: {} };
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeUiaInfo(result.data);
  logger.info('local-agent uia command', {
    tool,
    appId,
    action: baseAction,
    automationMethod: 'windows_uia',
    riskLevel: typeof safe.riskLevel === 'string' ? safe.riskLevel : null,
    elementRole: typeof safe.role === 'string' ? safe.role : null,
    elementCount: typeof safe.elementCount === 'number' ? safe.elementCount : null,
    status: result.status,
    errorCode: result.errorCode ?? null,
    durationMs: Date.now() - startedAt,
    deviceId,
  });
  return { status: result.status, errorCode: result.errorCode, safe };
}
