/** Presentation only. Authorization, scope resolution and tool execution stay in the route/contract. */
import {
  AI_TOOL_NAMES,
  type AiToolName,
  type ToolResult,
} from '../../services/ai-tools/ai-tool-contract.js';
import {
  isDomToolName,
  isSupplierToolName,
} from '../../services/ai-tools/ai-tool-router.js';
import type { VerifiedScopeFacts } from '../../services/ai-prompts/homeChat.js';

type ToolPresentationFacts = Pick<
  VerifiedScopeFacts,
  | 'windowsAppAction'
  | 'browserAction'
  | 'computerAction'
  | 'supplierLookup'
  | 'pharmacyWebAction'
  | 'browserDomAction'
>;

function actionFacts(
  tool: AiToolName,
  result: ToolResult,
): ToolPresentationFacts {
  switch (tool) {
    case AI_TOOL_NAMES.ACTIVATE_WINDOW:
      return { windowsAppAction: 'activate' };
    case AI_TOOL_NAMES.FIND_APPLICATION:
      return { windowsAppAction: 'inspect' };
    case AI_TOOL_NAMES.BROWSER_OPEN_SITE:
      return { browserAction: 'open' };
    case AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS:
      return { browserAction: 'inspect' };
    case AI_TOOL_NAMES.COMPUTER_INSPECT:
      return { computerAction: 'inspect' };
    case AI_TOOL_NAMES.COMPUTER_CLICK:
      return { computerAction: 'click' };
    case AI_TOOL_NAMES.COMPUTER_TYPE_TEXT:
      return { computerAction: 'type_text' };
    case AI_TOOL_NAMES.COMPUTER_KEY:
      return { computerAction: 'key' };
    default: {
      const available = result.data?.available === true;
      if (isSupplierToolName(tool))
        return { supplierLookup: available ? 'read' : 'blocked' };
      if (tool === AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT)
        return { pharmacyWebAction: available ? 'read' : 'blocked' };
      if (isDomToolName(tool))
        return {
          browserDomAction: available
            ? tool === AI_TOOL_NAMES.DOM_SET_INPUT ||
              tool === AI_TOOL_NAMES.DOM_SELECT_OPTION ||
              tool === AI_TOOL_NAMES.DOM_CLICK
              ? 'interact'
              : 'read'
            : 'blocked',
        };
      return {};
    }
  }
}

export function buildHomeChatToolPresentation(
  tool: AiToolName,
  result: ToolResult,
  hasContext: boolean,
): {
  facts: ToolPresentationFacts;
  browserSiteOpened: { siteId: string; displayName: string } | null;
} {
  // Keep the renderer's gate: no action assertion when it produced no context block.
  const facts = hasContext ? actionFacts(tool, result) : {};
  const opened =
    tool === AI_TOOL_NAMES.BROWSER_OPEN_SITE &&
    result.ok &&
    result.data?.available === true &&
    result.data?.opened === true;
  return {
    facts,
    // Opening is independent of the prompt gate and never proves a login or carries URL/device/organization data.
    browserSiteOpened: opened
      ? {
          siteId: String(result.data?.siteId ?? ''),
          displayName: String(result.data?.displayName ?? ''),
        }
      : null,
  };
}
