/**
 * Browser DOM executor primitives — 명령 발행 · fallback 추적 · find 후보 선택 (공통)
 *
 * WO-O4O-BROWSER-DOM-CONTROL-V0 §8·§9·§13·§28·§29·§30·§51 에서 ai-tool-router.ts 안에 있던 것을
 * WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0 §2 에서 별도 모듈로 옮겼다 — DOM tool ·
 * Supplier Adapter · Pharmacy Web Adapter 가 **같은 발행 경로**를 쓰기 위해서다. 동작은 바꾸지 않았다.
 *
 * 여기서 발행되는 명령은 전부 `local.browser.dom.*#siteId` 이며 selector · URL · JS 를 실을 칸이 없다.
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import type { VerifiedToolContext } from './ai-tool-contract.js';
import {
  FALLBACK_REASON,
  resolveAutomationMethod,
  type AutomationRiskLevel,
  type FallbackReason,
} from './automation-execution-contract.js';
import { LOCAL_AGENT_ERROR, composeSiteAction } from '../local-agent/local-agent-protocol.js';
import { awaitCommandResult, issueCommand } from '../local-agent/local-agent-service.js';
import { pickSafeDomInfo } from '../local-agent/browser-dom-contract.js';

/** click · set_input · select_option 대상으로 삼을 수 있는 role. 그 밖은 실행하지 않는다(§18·§22). */
export const DOM_CLICKABLE_ROLES: readonly string[] = Object.freeze(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem']);
export const DOM_INPUT_ROLES: readonly string[] = Object.freeze(['textbox', 'searchbox', 'textarea']);
export const DOM_SELECT_ROLES: readonly string[] = Object.freeze(['combobox']);

/** DOM 실패 → computer_use fallback **후보** 사유. 실행하지 않는다(§30). 여기 없는 실패는 후보도 아니다. */
export function domFallbackReason(errorCode: string | undefined): FallbackReason | undefined {
  if (errorCode === LOCAL_AGENT_ERROR.DOM_ELEMENT_NOT_FOUND) return FALLBACK_REASON.DOM_ELEMENT_NOT_FOUND;
  if (errorCode === LOCAL_AGENT_ERROR.DOM_CONTENT_UNAVAILABLE) return FALLBACK_REASON.ACCESSIBILITY_UNAVAILABLE;
  return undefined;
}

/**
 * DOM 명령 하나를 발행하고 결과를 기다린다. 안전 로그(§51)는 tool · siteId · action · riskLevel ·
 * automationMethod · status · errorCode · fallbackReason · duration 뿐 — 입력 텍스트 · 페이지 텍스트 ·
 * HTML · 좌표 · URL 은 값 안에 애초에 없다(pickSafeDomInfo).
 */
export async function issueDomCommand(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  deviceId: string,
  tool: string,
  baseAction: string,
  siteId: string,
  args: Record<string, unknown> | undefined,
): Promise<{ status: string; errorCode?: string; safe: Record<string, unknown>; fallbackReason?: FallbackReason }> {
  const startedAt = Date.now();
  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId,
    action: composeSiteAction(baseAction, siteId),
    toolName: tool,
    args,
  });
  if (issued.ok === false) {
    return { status: 'denied', errorCode: issued.errorCode, safe: {} };
  }
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeDomInfo(result.data);
  const fallbackReason = result.status === 'success' ? undefined : domFallbackReason(result.errorCode);
  logger.info('local-agent browser dom command', {
    tool,
    siteId,
    action: baseAction,
    automationMethod: 'browser_dom',
    riskLevel: typeof safe.riskLevel === 'string' ? safe.riskLevel : null,
    elementRole: typeof safe.role === 'string' ? safe.role : null,
    status: result.status,
    errorCode: result.errorCode ?? null,
    fallbackReason: fallbackReason ?? null,
    durationMs: Date.now() - startedAt,
    deviceId,
  });
  return { status: result.status, errorCode: result.errorCode, safe, fallbackReason };
}

/**
 * fallback 추적 정보(§30·§41 TRACEABLE). `resolveAutomationMethod` 에 "이 작업에는 computer_use 가
 * **available 하지 않다**" 를 그대로 넣는다 — 사이트 축은 computer_use 대상(등재 앱 창)이 아니므로
 * 결정은 항상 blocked 다. 그 결정과 사유가 결과에 남는다. 자동 실행은 없다.
 */
export function traceDomFallback(riskLevel: AutomationRiskLevel, fallbackReason: FallbackReason | undefined) {
  const decision = resolveAutomationMethod({ availableMethods: [], riskLevel, fallbackReason });
  return {
    fallbackReason: fallbackReason ?? null,
    fallbackCandidate: 'computer_use',
    fallbackExecuted: false,
    fallbackDecision: decision.blocked ? decision.blockReason : decision.method,
  };
}

/**
 * find 후보 중 하나를 결정론적으로 고른다. 정확한 이름 일치 + role 적합 → role 적합 → (role 제한 없으면) 첫 후보.
 * 후보가 여럿이고 어느 것도 정확히 맞지 않으면 **첫 후보를 고르지 않고 null** — 엉뚱한 버튼을 누르지 않는다.
 */
export function chooseDomTarget(
  matches: readonly Record<string, unknown>[],
  wanted: string,
  acceptRoles?: readonly string[],
): Record<string, unknown> | null {
  const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toLowerCase();
  const want = norm(wanted);
  const roleOk = (m: Record<string, unknown>) => !acceptRoles || acceptRoles.includes(String(m.role));
  const eligible = matches.filter(roleOk);
  if (eligible.length === 0) return null;
  const exact = eligible.filter((m) => norm(m.name) === want || norm(m.text) === want);
  if (exact.length >= 1) return exact[0];
  return eligible.length === 1 ? eligible[0] : null;
}

