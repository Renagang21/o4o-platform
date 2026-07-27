/**
 * WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1
 *
 * PATCH /stores/:slug/settings 의 template ↔ blocks 적용 규칙 단위 테스트.
 * 결함 재발 방지: 템플릿을 바꿨는데 이전 템플릿의 blocks 가 남아
 * 공개 매장 홈에 반영되지 않는 상황을 잡는다.
 */

import {
  generateDefaultBlocks,
  normalizeTemplate,
  resolveTemplateAndBlocks,
} from '../store-settings-template';
import type { StoreBlock } from '../store-settings.types';

const BASIC_BLOCKS = generateDefaultBlocks('BASIC');

describe('generateDefaultBlocks', () => {
  it('템플릿별로 서로 다른 기본 블록 구성을 만든다', () => {
    expect(generateDefaultBlocks('BASIC').map((b) => b.type)).toEqual([
      'HERO', 'PRODUCT_GRID', 'BLOG_LIST', 'TABLET_PROMO',
    ]);
    expect(generateDefaultBlocks('COMMERCE_FOCUS').map((b) => b.type)).toEqual([
      'HERO', 'PRODUCT_GRID', 'BLOG_LIST',
    ]);
    expect(generateDefaultBlocks('CONTENT_FOCUS').map((b) => b.type)).toEqual([
      'HERO', 'BLOG_LIST', 'INFO_SECTION', 'PRODUCT_GRID',
    ]);
    expect(generateDefaultBlocks('MINIMAL').map((b) => b.type)).toEqual([
      'HERO', 'PRODUCT_GRID',
    ]);
  });

  it('모든 기본 블록은 enabled 이다', () => {
    for (const t of ['BASIC', 'COMMERCE_FOCUS', 'CONTENT_FOCUS', 'MINIMAL'] as const) {
      expect(generateDefaultBlocks(t).every((b) => b.enabled)).toBe(true);
    }
  });
});

describe('normalizeTemplate', () => {
  it('legacy template_profile 이름을 매핑한다', () => {
    expect(normalizeTemplate('standard')).toBe('BASIC');
    expect(normalizeTemplate('compact')).toBe('MINIMAL');
    expect(normalizeTemplate('visual')).toBe('CONTENT_FOCUS');
  });

  it('null/미지의 값은 BASIC 으로 떨어진다', () => {
    expect(normalizeTemplate(null)).toBe('BASIC');
    expect(normalizeTemplate(undefined)).toBe('BASIC');
    expect(normalizeTemplate('nonsense')).toBe('BASIC');
  });
});

describe('resolveTemplateAndBlocks', () => {
  it('BASIC → COMMERCE_FOCUS + applyTemplateDefaults: 새 템플릿 기본 blocks 로 교체된다', () => {
    const r = resolveTemplateAndBlocks({
      currentTemplate: 'BASIC',
      currentBlocks: BASIC_BLOCKS,
      patchTemplate: 'COMMERCE_FOCUS',
      patchBlocks: BASIC_BLOCKS, // 프론트가 화면 state 를 그대로 함께 전송
      applyTemplateDefaults: true,
    });

    expect(r.template).toBe('COMMERCE_FOCUS');
    expect(r.blocksSource).toBe('template-defaults');
    expect(r.blocksChanged).toBe(true);
    expect(r.blocks).toEqual(generateDefaultBlocks('COMMERCE_FOCUS'));
    // 이전 템플릿에만 있던 블록이 남지 않는다 (기존 결함)
    expect(r.blocks.some((b) => b.type === 'TABLET_PROMO')).toBe(false);
  });

  it('같은 템플릿에서 theme 만 변경: 기존 blocks 를 유지하고 write 하지 않는다', () => {
    const r = resolveTemplateAndBlocks({
      currentTemplate: 'BASIC',
      currentBlocks: BASIC_BLOCKS,
      patchTemplate: undefined,
      patchBlocks: undefined,
    });

    expect(r.template).toBe('BASIC');
    expect(r.blocks).toEqual(BASIC_BLOCKS);
    expect(r.blocksChanged).toBe(false);
    expect(r.blocksSource).toBe('unchanged');
  });

  it('같은 템플릿에서 blocks 직접 편집: 편집 blocks 가 그대로 저장된다', () => {
    const edited: StoreBlock[] = [
      { type: 'PRODUCT_GRID', enabled: true, config: { limit: 8 } },
      { type: 'HERO', enabled: false },
    ];
    const r = resolveTemplateAndBlocks({
      currentTemplate: 'BASIC',
      currentBlocks: BASIC_BLOCKS,
      patchTemplate: 'BASIC',
      patchBlocks: edited,
    });

    expect(r.blocks).toEqual(edited);
    expect(r.blocksSource).toBe('request');
    expect(r.blocksChanged).toBe(true);
  });

  it('applyTemplateDefaults 없이 template 만 바뀌면 blocks 는 요청값을 따른다(기존 계약 불변)', () => {
    const r = resolveTemplateAndBlocks({
      currentTemplate: 'BASIC',
      currentBlocks: BASIC_BLOCKS,
      patchTemplate: 'MINIMAL',
      patchBlocks: BASIC_BLOCKS,
    });

    expect(r.template).toBe('MINIMAL');
    expect(r.blocks).toEqual(BASIC_BLOCKS);
    expect(r.blocksSource).toBe('request');
  });

  it('applyTemplateDefaults=true 이고 template 미전송이면 현재 템플릿 기본값을 적용한다', () => {
    const r = resolveTemplateAndBlocks({
      currentTemplate: 'CONTENT_FOCUS',
      currentBlocks: [{ type: 'HERO', enabled: false }],
      applyTemplateDefaults: true,
    });

    expect(r.template).toBe('CONTENT_FOCUS');
    expect(r.blocks).toEqual(generateDefaultBlocks('CONTENT_FOCUS'));
  });

  it('사용자 편집 blocks 는 applyTemplateDefaults=false 일 때 기본값에 덮이지 않는다', () => {
    const edited: StoreBlock[] = [{ type: 'HERO', enabled: true }];
    const r = resolveTemplateAndBlocks({
      currentTemplate: 'BASIC',
      currentBlocks: BASIC_BLOCKS,
      patchTemplate: 'COMMERCE_FOCUS',
      patchBlocks: edited,
      applyTemplateDefaults: false,
    });

    expect(r.template).toBe('COMMERCE_FOCUS');
    expect(r.blocks).toEqual(edited);
    expect(r.blocksSource).toBe('request');
  });

  it('blocks 결과는 입력 배열을 변형하지 않는다', () => {
    const snapshot = JSON.parse(JSON.stringify(BASIC_BLOCKS));
    resolveTemplateAndBlocks({
      currentTemplate: 'BASIC',
      currentBlocks: BASIC_BLOCKS,
      patchTemplate: 'MINIMAL',
      applyTemplateDefaults: true,
    });
    expect(BASIC_BLOCKS).toEqual(snapshot);
  });
});
