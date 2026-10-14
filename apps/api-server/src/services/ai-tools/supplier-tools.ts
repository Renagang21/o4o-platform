import { extractQuotedStrings, renderDomFailure, DOM_UNTRUSTED_NOTE, fence } from "./dom-tools.js";
import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import { AI_TOOL_NAMES, type ToolResult, type VerifiedToolContext } from './ai-tool-contract.js';
import { LOCAL_AGENT_ACTIONS, LOCAL_AGENT_ERROR } from '../local-agent/local-agent-protocol.js';
import { DOM_CLICKABLE_ROLES, DOM_INPUT_ROLES, chooseDomTarget, issueDomCommand, traceDomFallback } from './browser-dom-executor.js';
import { SUPPLIER_ADAPTER_IDS, SUPPLIER_ERROR, SUPPLIER_LOOKUP_MAX_DOM_COMMANDS, buildSupplierAvailability, findSupplierAdapter, looksLikeSupplierLoginScreen, mapSupplierColumns, matchSupplierProduct, supplierAdapterDisplayName, supplierAdapterHealth, supplierErrorFromDom, supplierQueryDenyReason } from '../local-agent/supplier-site-adapter-contract.js';
import { FALLBACK_REASON, type FallbackReason } from './automation-execution-contract.js';
import { resolveTargetDevice } from '../local-agent/local-agent-service.js';



// ═════════════════════════════════════════════════════════════════════════════
// Supplier Site Adapter V0 (WO-O4O-SUPPLIER-SITE-ADAPTER-V0)
//
//   요청 → 공급처 식별 → 검색어 → [탭 확인 → 검색창 → 입력 → 검색 → 결과표] → 상품 식별
//        → O4O 표준 결과(가격 · 재고 · 주문가능) → 프롬프트
//
//   Adapter 는 자기 실행기를 갖지 않는다(§6·§7). 위 대괄호 안의 모든 단계는 기존
//   `local.browser.dom.*` 명령이며, 사이트 특화 조건은 Adapter 정의 안에만 있다(§30).
//   장바구니 · 수량 · 주문 확정 · 결제는 이 축에 **없다**(§3).
// ═════════════════════════════════════════════════════════════════════════════

/** 한 단계에서 시도할 find 조건 개수 상한(§37 — 후보를 끝없이 훑지 않는다). */
export const SUPPLIER_FIND_ATTEMPTS = 2;


/**
 * 공급처 상품 조회 1건(§2·§11·§12·§15).
 *
 * 명령 순서는 고정이다 — get_context → find(검색창) → set_input → find(검색버튼) → click →
 * read_table. 결과를 보고 다음 행동을 AI 가 고르는 루프는 없다. 실패는 단계별로
 * `SUPPLIER_*` 오류로 정규화해 돌려주고(§33), **재시도하지 않는다**(§37).
 */
export async function executeSupplierProductLookup(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  supplierId: string,
  query: string,
): Promise<ToolResult> {
  const tool = AI_TOOL_NAMES.SUPPLIER_PRODUCT_LOOKUP;
  const displayName = supplierAdapterDisplayName(supplierId);
  const def = findSupplierAdapter(supplierId);
  const startedAt = Date.now();
  let domCommands = 0;
  let searchBoxFound = false;
  let resultAreaFound = false;
  let deviceId: string | null = null;

  /**
   * 공급처 축 로그(§44). supplierId · 단계 · 상태 · 오류 · 수단만 남긴다 —
   * **검색어 · 상품명 · 가격 · 페이지 텍스트는 키 자체가 없다.**
   */
  const finish = (
    status: string,
    errorCode: string | null,
    data: Record<string, unknown>,
    fallbackReason?: FallbackReason,
  ): ToolResult => {
    logger.info('local-agent supplier lookup', {
      tool,
      supplierId,
      siteId: def?.siteId ?? null,
      adapterVersion: def?.adapterVersion ?? null,
      automationMethod: 'browser_dom',
      status,
      errorCode,
      fallbackReason: fallbackReason ?? null,
      domCommands,
      durationMs: Date.now() - startedAt,
      deviceId,
    });
    return { ok: true, tool, data };
  };

  const fail = (errorCode: string, extra: Record<string, unknown> = {}, fallbackReason?: FallbackReason): ToolResult =>
    finish(
      'failed',
      errorCode,
      {
        available: false,
        supplierId,
        displayName,
        errorCode,
        automationMethod: 'browser_dom',
        adapterVersion: def?.adapterVersion ?? null,
        ...traceDomFallback('REVERSIBLE', fallbackReason),
        ...extra,
      },
      fallbackReason,
    );

  // 등재되지 않은 공급처는 여기서 끝난다 — 명령이 발행되지 않는다(§27).
  if (!def) return fail(SUPPLIER_ERROR.NOT_REGISTERED);
  if (supplierQueryDenyReason(query) !== null) return fail(SUPPLIER_ERROR.QUERY_INVALID);

  const resolution = await resolveTargetDevice(dataSource, ctx.userId, { need: 'browser' });
  if (resolution.status !== 'ok') {
    return fail(
      resolution.status === 'none'
        ? LOCAL_AGENT_ERROR.NO_DEVICE
        : LOCAL_AGENT_ERROR.OFFLINE,
    );
  }
  deviceId = resolution.device.id;

  const run = async (action: string, args?: Record<string, unknown>) => {
    if (domCommands >= SUPPLIER_LOOKUP_MAX_DOM_COMMANDS) {
      return { status: 'denied', errorCode: SUPPLIER_ERROR.SEARCH_FAILED, safe: {} as Record<string, unknown> };
    }
    domCommands += 1;
    return issueDomCommand(dataSource, ctx, deviceId as string, tool, action, def.siteId, args);
  };

  /** DOM 실패 → 공급처 오류. 매핑이 없으면 단계 기본 오류를 쓴다(§33). */
  const asSupplierError = (errorCode: string | undefined, fallbackCode: string): string =>
    supplierErrorFromDom(errorCode) ?? fallbackCode;

  // 1. 대상 탭 — 등재 site 탭이 열려 있고 준비됐는가(§11). Adapter 는 탭을 열지 않는다.
  const context = await run(LOCAL_AGENT_ACTIONS.DOM_GET_CONTEXT);
  if (context.status !== 'success') {
    return fail(asSupplierError(context.errorCode, SUPPLIER_ERROR.SITE_NOT_READY), {}, context.fallbackReason);
  }
  if (context.safe.ready !== true) return fail(SUPPLIER_ERROR.SITE_NOT_READY);
  // 등재 site 밖이면 멈춘다(§27). 확장도 같은 판정을 하지만 Adapter 쪽에서 한 번 더 본다.
  if (typeof context.safe.siteId === 'string' && context.safe.siteId !== def.siteId) {
    return fail(SUPPLIER_ERROR.SITE_CROSS_ORIGIN);
  }

  // 2. 검색창 — Adapter 정의의 구조화 조건을 순서대로(§11·§29).
  let boxRef: { elementRef: string; snapshotId: string } | null = null;
  for (const q of def.searchBox.slice(0, SUPPLIER_FIND_ATTEMPTS)) {
    const found = await run(LOCAL_AGENT_ACTIONS.DOM_FIND, { query: q });
    if (found.status !== 'success') continue;
    const matches = Array.isArray(found.safe.matches) ? (found.safe.matches as Record<string, unknown>[]) : [];
    const snapshotId = typeof found.safe.snapshotId === 'string' ? found.safe.snapshotId : null;
    const chosen = matches.find((m) => DOM_INPUT_ROLES.includes(String(m.role)) && m.disabled !== true);
    if (chosen && snapshotId) {
      boxRef = { elementRef: String(chosen.elementRef), snapshotId };
      break;
    }
  }
  searchBoxFound = boxRef !== null;

  // 3. 검색창이 없다 — 로그인 화면인가, Adapter 가 낡았는가(§32·§33).
  if (!boxRef) {
    const inspected = await run(LOCAL_AGENT_ACTIONS.DOM_INSPECT);
    const elements = Array.isArray(inspected.safe?.elements)
      ? (inspected.safe.elements as Record<string, unknown>[])
      : [];
    // 로그인 단계는 사용자 몫이다(§5·§25). fallbackReason 을 달지 않는다 — 화면 자동화로 내려갈
    // 후보조차 아니다.
    if (looksLikeSupplierLoginScreen(elements)) return fail(SUPPLIER_ERROR.LOGIN_REQUIRED);
    const health = supplierAdapterHealth(false, false);
    return fail(
      health.outdated ? SUPPLIER_ERROR.ADAPTER_OUTDATED : SUPPLIER_ERROR.SEARCH_FAILED,
      { searchBoxFound: false },
      FALLBACK_REASON.DOM_ELEMENT_NOT_FOUND,
    );
  }

  // 4. 검색어 입력(§11). 비밀번호·인증번호 필드면 확장이 거절하고 그것은 로그인 필요 신호다.
  const typed = await run(LOCAL_AGENT_ACTIONS.DOM_SET_INPUT, { ...boxRef, text: query });
  if (typed.status !== 'success') {
    return fail(asSupplierError(typed.errorCode, SUPPLIER_ERROR.SEARCH_FAILED), {}, typed.fallbackReason);
  }

  // 5. 검색 실행(§11). "검색" 은 COMMIT 표식이 아니므로 클릭이 허용된다 — COMMIT 으로 분류되는
  //    버튼이면 확장이 멈추고 여기서는 검색 실패로 보고한다(자동 우회하지 않는다).
  let clicked = false;
  for (const q of def.searchSubmit.slice(0, SUPPLIER_FIND_ATTEMPTS)) {
    const found = await run(LOCAL_AGENT_ACTIONS.DOM_FIND, { query: q });
    if (found.status !== 'success') continue;
    const matches = Array.isArray(found.safe.matches) ? (found.safe.matches as Record<string, unknown>[]) : [];
    const snapshotId = typeof found.safe.snapshotId === 'string' ? found.safe.snapshotId : null;
    const chosen = chooseDomTarget(matches, String(q.text ?? q.name ?? ''), DOM_CLICKABLE_ROLES);
    if (!chosen || !snapshotId) continue;
    const click = await run(LOCAL_AGENT_ACTIONS.DOM_CLICK, {
      elementRef: String(chosen.elementRef),
      snapshotId,
    });
    if (click.status === 'success') {
      clicked = true;
      break;
    }
    const mapped = supplierErrorFromDom(click.errorCode);
    if (mapped) return fail(mapped, {}, click.fallbackReason);
    break;
  }
  if (!clicked) return fail(SUPPLIER_ERROR.SEARCH_FAILED, { searchBoxFound: true });

  // 6. 결과표(§12). 표가 없으면 결과 영역을 읽지 못한 것이다.
  const table = await run(LOCAL_AGENT_ACTIONS.DOM_READ_TABLE, {});
  if (table.status !== 'success') {
    return fail(
      asSupplierError(table.errorCode, SUPPLIER_ERROR.SEARCH_FAILED),
      { searchBoxFound: true, resultAreaFound: false },
      table.fallbackReason,
    );
  }
  const columns = (Array.isArray(table.safe.columns) ? table.safe.columns : []) as string[];
  const rows = (Array.isArray(table.safe.rows) ? table.safe.rows : []) as string[][];
  resultAreaFound = columns.length > 0 || rows.length > 0;
  if (!resultAreaFound) {
    return fail(SUPPLIER_ERROR.SEARCH_FAILED, { searchBoxFound, resultAreaFound: false });
  }

  // 7. 열 해석(§12·§19·§20). 상품명 열을 못 찾으면 Adapter 가 낡았다고 본다(§32).
  const mapped = mapSupplierColumns(columns, def);
  if (!mapped.ok || !mapped.map) {
    return fail(SUPPLIER_ERROR.ADAPTER_OUTDATED, { searchBoxFound, resultAreaFound, columnCount: columns.length });
  }

  // 8. 상품 식별(§13·§35). 불확실하면 하나를 확정하지 않는다.
  const match = matchSupplierProduct(rows, mapped.map, query);
  if (match.status === 'none') {
    return fail(SUPPLIER_ERROR.PRODUCT_NOT_FOUND, { rowCount: rows.length });
  }
  if (match.status === 'multiple') {
    return fail(SUPPLIER_ERROR.MULTIPLE_MATCHES, { candidateCount: match.candidateCount, rowCount: rows.length });
  }

  // 9. 표준 결과(§15~§20·§22).
  const availability = buildSupplierAvailability(
    rows[match.rowIndex as number],
    mapped.map,
    def,
    new Date().toISOString(),
  );
  const warnings: string[] = [];
  if (availability.price === null) warnings.push(SUPPLIER_ERROR.PRICE_UNAVAILABLE);
  if (availability.stockStatus === 'unknown') warnings.push(SUPPLIER_ERROR.STOCK_UNKNOWN);

  return finish('success', null, {
    available: true,
    supplierId,
    displayName,
    adapterVersion: def.adapterVersion,
    // §14: 사용자가 말한 이름과 사이트가 표시한 이름은 서로 다른 칸이다. 덮어쓰지 않는다.
    sourceProductName: query,
    availability,
    warnings,
    rowCount: rows.length,
    automationMethod: 'browser_dom',
    fallbackExecuted: false,
    // 표에서 읽은 값이라는 출처 표시(§26) — renderer 가 UNTRUSTED 블록으로 감싼다.
    source: 'webpage',
  });
}


// ─── Supplier intents (§9·§10·§34) — 상품명은 사용자가 따옴표로 말한 것만 ──────

/** 공급처 호출 표식. 등재 Adapter 하나당 한 항목이다(site 축 SITE_INTENT_KEYWORDS 와 같은 방식). */
export const SUPPLIER_INTENT_KEYWORDS: readonly { supplierId: string; ko: readonly string[]; en: readonly RegExp[] }[] =
  Object.freeze([
    Object.freeze({
      supplierId: 'o4o.sample-supplier',
      ko: Object.freeze(['샘플공급처', '공급처샘플', '테스트공급처']),
      en: Object.freeze([/\bsample\s+supplier\b/i]),
    }),
  ]);


/**
 * 조회 의도 표식. 한글은 **문자열 리터럴**로 둔다 — 정규식 리터럴에 한글을 넣으면 esbuild
 * ascii charset 에서 깨진다(BROWSER-DOM-CONTROL-V0 에서 실제로 CI 를 깨뜨린 함정).
 */
export const SUPPLIER_LOOKUP_KEYWORDS_KO: readonly string[] = Object.freeze([
  '가격',
  '단가',
  '재고',
  '주문가능',
  '주문할수있',
  '시세',
]);

export const SUPPLIER_LOOKUP_EN: readonly RegExp[] = [/\bprice\b/i, /\bstock\b/i, /\bavailab/i];


/**
 * 등재 공급처 하나를 가리키는가(§27). 둘 이상 걸리면 고르지 않는다 — 어느 공급처인지
 * 단정하지 않는 것이 안전하다.
 */
export function detectSupplierAdapter(message: string): string | null {
  const compact = String(message ?? '').replace(/\s+/g, '');
  const hits = SUPPLIER_INTENT_KEYWORDS.filter(
    (s) => s.ko.some((k) => compact.includes(k)) || s.en.some((re) => re.test(message)),
  ).map((s) => s.supplierId);
  const unique = [...new Set(hits)].filter((id) => SUPPLIER_ADAPTER_IDS.includes(id));
  return unique.length === 1 ? unique[0] : null;
}


/** 가격 · 재고 · 주문 가능 여부를 묻는 문장인가. */
export function asksForSupplierLookup(message: string): boolean {
  const compact = String(message ?? '').replace(/\s+/g, '');
  if (SUPPLIER_LOOKUP_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return SUPPLIER_LOOKUP_EN.some((re) => re.test(message));
}


export interface SupplierLookupIntent {
  supplierId: string;
  query: string;
}


/** 공급처 요청이었으나 실행할 수 없는 이유(§35 "자동으로 하나를 확정하지 않는다" 의 입력 단계 판). */
export type SupplierRequestGap = 'SUPPLIER_QUERY_MISSING' | 'SUPPLIER_QUERY_DENIED';


/**
 * 공급처 조회 의도를 결정론적으로 뽑는다(§9·§10).
 *
 * 상품명은 **사용자가 따옴표로 말한 첫 구절**이다 — Adapter 도 AI 도 상품을 지어내지 않는다(§10).
 * 따옴표가 없으면 null 이고, `supplierRequestGap` 이 사유를 준다(되묻는다).
 */
export function detectSupplierLookupIntent(message: string): SupplierLookupIntent | null {
  const supplierId = detectSupplierAdapter(message);
  if (!supplierId) return null;
  if (!asksForSupplierLookup(message)) return null;
  const quotes = extractQuotedStrings(message);
  if (quotes.length === 0) return null;
  const query = quotes[0];
  if (supplierQueryDenyReason(query) !== null) return null;
  return { supplierId, query };
}


export function supplierRequestGap(message: string): SupplierRequestGap | null {
  if (!detectSupplierAdapter(message) || !asksForSupplierLookup(message)) return null;
  const quotes = extractQuotedStrings(message);
  if (quotes.length === 0) return 'SUPPLIER_QUERY_MISSING';
  return supplierQueryDenyReason(quotes[0]) === null ? null : 'SUPPLIER_QUERY_DENIED';
}


export function isSupplierToolName(name: string): boolean {
  return typeof name === 'string' && name.startsWith('local.supplier.');
}


// ─── Supplier renderer (§26·§34·§35) — 사이트에서 읽은 값은 UNTRUSTED 로 표시한다 ──

export const SUPPLIER_HEADER = '## 공급처 상품 조회 결과\n';


export const SUPPLIER_FAILURE_LINE: Record<string, string> = {
  [SUPPLIER_ERROR.NOT_REGISTERED]: '- 등록된 공급처가 아니어서 아무 것도 하지 않았습니다.',
  [SUPPLIER_ERROR.QUERY_INVALID]: '- 검색할 상품명이 올바르지 않아 조회하지 않았습니다.',
  [SUPPLIER_ERROR.SITE_NOT_READY]:
    '- 공급처 화면이 준비되지 않아 조회하지 못했습니다. 공급처 사이트 탭을 열고 로그인한 뒤 다시 요청하도록 안내하세요.',
  [SUPPLIER_ERROR.LOGIN_REQUIRED]:
    '- 공급처 사이트가 **로그인을 요구하고 있습니다.** O4O 는 로그인을 대행하지 않습니다 — ' +
    '사용자가 직접 로그인한 뒤 다시 요청하도록 안내하고, 아이디·비밀번호·OTP 를 묻지 마세요.',
  [SUPPLIER_ERROR.SEARCH_FAILED]: '- 공급처 화면에서 상품 검색을 끝내지 못했습니다. 사용자가 직접 확인해야 합니다.',
  [SUPPLIER_ERROR.PRODUCT_NOT_FOUND]: '- 검색 결과가 없습니다. 상품명을 다시 확인하도록 안내하세요.',
  [SUPPLIER_ERROR.MULTIPLE_MATCHES]:
    '- 여러 상품이 검색되었습니다. **하나를 임의로 고르지 않았습니다.** 상품명·규격을 더 정확히 알려 달라고 되물으세요.',
  [SUPPLIER_ERROR.ADAPTER_OUTDATED]:
    '- 공급처 화면 구조가 O4O 가 아는 것과 달라 결과를 해석하지 못했습니다. 사용자가 직접 확인해야 합니다.',
  [SUPPLIER_ERROR.SITE_CROSS_ORIGIN]: '- 등록된 공급처 사이트 밖 화면이어서 조회하지 않았습니다.',
};


export const SUPPLIER_STOCK_LABEL: Record<string, string> = {
  in_stock: '있음',
  low_stock: '소량',
  out_of_stock: '품절',
  unknown: '알 수 없음',
};


export function renderSupplierLookup(data: Record<string, unknown>): string {
  const displayName = String(data.displayName ?? '해당 공급처');
  if (data.available !== true) {
    const code = String(data.errorCode ?? '');
    const known = SUPPLIER_FAILURE_LINE[code];
    if (known) {
      const extra =
        code === SUPPLIER_ERROR.MULTIPLE_MATCHES && typeof data.candidateCount === 'number'
          ? ` (후보 ${data.candidateCount}건)`
          : '';
      return SUPPLIER_HEADER + `- 공급처: ${displayName}\n` + known + extra;
    }
    // DOM/장치 공통 실패(확장 미연결 · PC 없음 등)는 기존 안내를 재사용한다.
    return SUPPLIER_HEADER + `- 공급처: ${displayName}\n` + (renderDomFailure(data, displayName) ?? '- 조회하지 못했습니다.');
  }

  const a = (data.availability ?? {}) as Record<string, unknown>;
  const price = typeof a.price === 'number' ? `${a.price.toLocaleString('ko-KR')}원` : '화면에 표시되지 않음';
  const stock = SUPPLIER_STOCK_LABEL[String(a.stockStatus ?? 'unknown')] ?? '알 수 없음';
  const orderable = a.orderable === true ? '예' : a.orderable === false ? '아니오' : '판단 불가';
  const lines = [
    `- 공급처: ${displayName}`,
    `- 요청한 상품명: ${String(data.sourceProductName ?? '')}`,
    `- 공급처 표시 상품명: ${String(a.productName ?? '')}`,
    ...(a.packSize ? [`- 포장단위: ${String(a.packSize)}`] : []),
    ...(a.supplierProductId ? [`- 공급처 상품코드: ${String(a.supplierProductId)}`] : []),
    `- 가격: ${price}`,
    `- 재고: ${stock}`,
    `- 주문 가능: ${orderable}`,
    `- 확인 시각: ${String(a.checkedAt ?? '')}`,
  ];
  return (
    SUPPLIER_HEADER +
    '- 아래 값은 공급처 화면에 **표시된 값을 그대로 읽은 것**입니다. 추정·계산한 값이 아닙니다.\n' +
    DOM_UNTRUSTED_NOTE +
    fence(lines.join('\n'))
  );
}
