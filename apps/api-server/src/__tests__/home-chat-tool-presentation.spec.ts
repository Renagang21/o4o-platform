import { buildHomeChatToolPresentation } from '../routes/ai-proxy/home-chat-tool-presentation.js';
import {
  AI_TOOL_NAMES as T,
  type AiToolName,
  type ToolResult,
} from '../services/ai-tools/ai-tool-contract.js';

function result(
  tool: AiToolName,
  data: Record<string, unknown> = {},
): ToolResult {
  return { tool, ok: true, data };
}
it.each([
  [T.ACTIVATE_WINDOW, { windowsAppAction: 'activate' }],
  [T.FIND_APPLICATION, { windowsAppAction: 'inspect' }],
  [T.BROWSER_OPEN_SITE, { browserAction: 'open' }],
  [T.BROWSER_GET_SITE_STATUS, { browserAction: 'inspect' }],
  [T.COMPUTER_INSPECT, { computerAction: 'inspect' }],
  [T.COMPUTER_CLICK, { computerAction: 'click' }],
  [T.COMPUTER_TYPE_TEXT, { computerAction: 'type_text' }],
  [T.COMPUTER_KEY, { computerAction: 'key' }],
] as const)(
  'preserves the performed-action fact for %s only when context is rendered',
  (tool, facts) => {
    expect(
      buildHomeChatToolPresentation(tool, result(tool), true).facts,
    ).toEqual(facts);
    expect(
      buildHomeChatToolPresentation(tool, result(tool), false).facts,
    ).toEqual({});
  },
);
it.each([T.DOM_FIND, T.DOM_READ_TEXT, T.DOM_READ_TABLE, T.DOM_GET_CONTEXT])(
  'classifies %s as read, or blocked unless explicitly available',
  (tool) => {
    expect(
      buildHomeChatToolPresentation(
        tool,
        result(tool, { available: true }),
        true,
      ).facts,
    ).toEqual({ browserDomAction: 'read' });
    expect(
      buildHomeChatToolPresentation(
        tool,
        result(tool, { available: 'true' }),
        true,
      ).facts,
    ).toEqual({ browserDomAction: 'blocked' });
  },
);
it.each([T.DOM_SET_INPUT, T.DOM_SELECT_OPTION, T.DOM_CLICK])(
  'classifies %s as interact only when available',
  (tool) => {
    expect(
      buildHomeChatToolPresentation(
        tool,
        result(tool, { available: true }),
        true,
      ).facts,
    ).toEqual({ browserDomAction: 'interact' });
    expect(
      buildHomeChatToolPresentation(
        tool,
        { tool, ok: false, reason: 'CAPABILITY_MISSING' },
        true,
      ).facts,
    ).toEqual({ browserDomAction: 'blocked' });
  },
);
it('reports site opening independently of the context gate without disclosing raw data or claiming login', () => {
  const data = {
    available: true,
    opened: true,
    siteId: 'synthetic-site',
    displayName: 'Synthetic site',
    url: 'synthetic-private-url',
    organizationId: 'private-org',
    loggedIn: true,
  };
  const tool = T.BROWSER_OPEN_SITE;
  const response = result(tool, data);
  expect(buildHomeChatToolPresentation(tool, response, false)).toEqual({
    facts: {},
    browserSiteOpened: {
      siteId: 'synthetic-site',
      displayName: 'Synthetic site',
    },
  });
  for (const changed of [
    { ok: false },
    { data: { ...data, opened: false } },
    { data: { ...data, available: false } },
  ]) {
    expect(
      buildHomeChatToolPresentation(tool, { ...response, ...changed }, true)
        .browserSiteOpened,
    ).toBeNull();
  }
  expect(response.data).toEqual(data);
  expect(
    buildHomeChatToolPresentation(T.BROWSER_GET_SITE_STATUS, response, true)
      .browserSiteOpened,
  ).toBeNull();
});
it('adds no action facts for unrelated tools', () => {
  expect(
    buildHomeChatToolPresentation(
      T.WORK_AGENT_PERFORM,
      result(T.WORK_AGENT_PERFORM),
      true,
    ),
  ).toEqual({ facts: {}, browserSiteOpened: null });
});
it.each([T.PHARMACY_WEB_ENTRYPOINT, T.SUPPLIER_PRODUCT_LOOKUP])(
  'keeps %s read/blocked facts separate from browser DOM facts',
  (tool) => {
    const field =
      tool === T.PHARMACY_WEB_ENTRYPOINT
        ? 'pharmacyWebAction'
        : 'supplierLookup';
    expect(
      buildHomeChatToolPresentation(
        tool,
        result(tool, { available: true }),
        true,
      ).facts,
    ).toEqual({ [field]: 'read' });
    expect(
      buildHomeChatToolPresentation(tool, result(tool), true).facts,
    ).toEqual({ [field]: 'blocked' });
    expect(
      buildHomeChatToolPresentation(tool, result(tool), false).facts,
    ).toEqual({});
  },
);
