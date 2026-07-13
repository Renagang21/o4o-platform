/**
 * WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1
 * content_list block config 검증 단위 테스트.
 */
import {
  parseContentListConfig,
  CONTENT_LIST_SOURCE_TYPES,
} from '../store-tablet-content-list-block.js';

describe('parseContentListConfig', () => {
  it('accepts empty items array', () => {
    const r = parseContentListConfig({ items: [] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.items).toEqual([]);
  });

  it('accepts a valid o4o_product_description item and defaults language=ko, visible=true', () => {
    const r = parseContentListConfig({
      items: [{ sourceType: 'o4o_product_description', masterId: '  m1  ' }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.items[0]).toEqual({
        sourceType: 'o4o_product_description',
        masterId: 'm1',
        language: 'ko',
        displayTitle: null,
        displaySummary: null,
        visible: true,
        sortOrder: 0,
      });
    }
  });

  it('accepts a valid store_content item with overrides and explicit sortOrder', () => {
    const r = parseContentListConfig({
      items: [{ sourceType: 'store_content', contentId: 'c1', displayTitle: ' T ', visible: false, sortOrder: 20 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.items[0]).toEqual({
        sourceType: 'store_content',
        contentId: 'c1',
        displayTitle: 'T',
        displaySummary: null,
        visible: false,
        sortOrder: 20,
      });
    }
  });

  it('rejects non-object config', () => {
    expect(parseContentListConfig(null).ok).toBe(false);
    expect(parseContentListConfig([]).ok).toBe(false);
  });

  it('rejects non-array items', () => {
    const r = parseContentListConfig({ items: {} });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid sourceType', () => {
    const r = parseContentListConfig({ items: [{ sourceType: 'supplier_product', masterId: 'm1' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('sourceType');
  });

  it('rejects o4o_product_description without masterId', () => {
    const r = parseContentListConfig({ items: [{ sourceType: 'o4o_product_description' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('masterId');
  });

  it('rejects store_content without contentId', () => {
    const r = parseContentListConfig({ items: [{ sourceType: 'store_content' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('contentId');
  });

  it('rejects non-boolean visible and non-number sortOrder', () => {
    expect(parseContentListConfig({ items: [{ sourceType: 'store_content', contentId: 'c1', visible: 'yes' }] }).ok).toBe(false);
    expect(parseContentListConfig({ items: [{ sourceType: 'store_content', contentId: 'c1', sortOrder: 'x' }] }).ok).toBe(false);
  });

  it('rejects invalid override types', () => {
    const r = parseContentListConfig({ items: [{ sourceType: 'store_content', contentId: 'c1', displayTitle: 5 }] });
    expect(r.ok).toBe(false);
  });

  it('exposes exactly the two supported source types', () => {
    expect([...CONTENT_LIST_SOURCE_TYPES]).toEqual(['o4o_product_description', 'store_content']);
  });
});
