/**
 * POP V2 handoff 계약 정적 테스트
 * WO-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1 §4 · §9 · §11
 *
 * 고정하는 것
 *   1. handoff payload 에 **본문/이미지**를 싣지 않는다 (식별자 + 제목 hint 만).
 *   2. HUB / 자료함 / 상품 진입점이 legacy POP route 로 되돌아가지 않는다.
 *   3. 공통 Core 에 serviceKey 분기가 생기지 않는다.
 *   4. parse 는 알 수 없는 origin 을 통과시키지 않는다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CANONICAL_STORE_POP_V2_ROUTE,
  POP_V2_HANDOFF_STATE_KEY,
  buildPopV2HandoffState,
  parsePopV2HandoffState,
  popV2HandoffFromProductionItem,
} from '../handoff';

const SRC = resolve(__dirname, '../../..');
const readCode = (rel: string) =>
  readFileSync(resolve(SRC, rel), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const HANDOFF_ENTRY_POINTS = [
  'components/pop-staff/StorePopStaffView.tsx',
  'components/local-products/StoreLocalProductsManager.tsx',
  'components/product-marketing/ProductMarketingView.tsx',
  'components/StoreProductionMaterialsView.tsx',
];

describe('PopV2HandoffInput — 최소 계약', () => {
  it('식별자와 제목 hint 외의 필드를 담지 않는다', () => {
    const state = buildPopV2HandoffState({
      sourceKind: 'content',
      origin: 'snapshot',
      sourceId: 'abc',
      suggestedTitle: '여름 캠페인',
    });
    expect(Object.keys(state)).toEqual([POP_V2_HANDOFF_STATE_KEY]);
    expect(Object.keys(state.popV2Handoff).sort()).toEqual([
      'origin',
      'sourceId',
      'sourceKind',
      'suggestedTitle',
    ]);
  });

  it('왕복(build → parse)이 값을 보존한다', () => {
    const input = { sourceKind: 'product', origin: 'local', sourceId: 'p-1' } as const;
    expect(parsePopV2HandoffState(buildPopV2HandoffState(input))).toMatchObject(input);
  });

  it('알 수 없는 origin / 빈 id 는 무시한다', () => {
    expect(
      parsePopV2HandoffState({ popV2Handoff: { sourceKind: 'content', origin: 'spd', sourceId: 'x' } }),
    ).toBeUndefined();
    expect(
      parsePopV2HandoffState({ popV2Handoff: { sourceKind: 'content', origin: 'direct', sourceId: '' } }),
    ).toBeUndefined();
    expect(parsePopV2HandoffState(null)).toBeUndefined();
    expect(parsePopV2HandoffState({ production: { target: 'pop' } })).toBeUndefined();
  });

  it('자료함 origin=local 은 상품 축으로, 나머지는 콘텐츠 축으로 간다', () => {
    expect(popV2HandoffFromProductionItem({ id: 'l1', origin: 'local' }).sourceKind).toBe('product');
    for (const origin of ['snapshot', 'direct', 'library'] as const) {
      const h = popV2HandoffFromProductionItem({ id: 'c1', origin });
      expect(h.sourceKind).toBe('content');
      expect(h.origin).toBe(origin);
    }
  });
});

describe('handoff 진입점 — legacy POP route 회귀 금지', () => {
  it('canonical route 는 POP V2 다', () => {
    expect(CANONICAL_STORE_POP_V2_ROUTE).toBe('/store/marketing/pop-v2');
  });

  it.each(HANDOFF_ENTRY_POINTS)('%s 는 legacy POP route 를 직접 쓰지 않는다', (rel) => {
    const code = readCode(rel);
    expect(code).not.toMatch(/['"]\/store\/marketing\/pop['"]/);
    expect(code).not.toMatch(/prefillPop/);
  });

  it.each([
    ...HANDOFF_ENTRY_POINTS,
    'components/pop-v2/handoff.ts',
    'components/StartProductionModal.tsx',
  ])('%s 에 serviceKey 분기가 없다', (rel) => {
    const code = readCode(rel);
    expect(code).not.toMatch(/serviceKey\s*===/);
    expect(code).not.toMatch(/['"](kpa|kpa-society|k-cosmetics|cosmetics|pharmacy-hub)['"]/);
  });
});
