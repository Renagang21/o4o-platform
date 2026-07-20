/**
 * WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1
 *
 * resolveContentListItems 의 **화면 구성 책임**(visible 필터 · sortOrder 정렬 · displayTitle/displaySummary
 * override · 미존재 skip · 잘못된 config → [])이 원본 조회 adapter 분리 후에도 불변임을 고정한다.
 * 원본 조회(DB)는 mock ContentSourceAdapter 로 대체 — resolver 로직만 검증.
 */
import { resolveContentListItems } from '../store-public-tablet-content-resolve.js';
import type { ContentSourceAdapter, ResolvedSourceContent } from '../store-public-tablet-content-source.js';

const O4O_SRC = (masterId: string, language: string): ResolvedSourceContent => ({
  itemId: `o4o:${masterId}:${language}`,
  sourceBadge: 'O4O 표준',
  baseTitle: `마스터-${masterId}`,
  baseSummary: `요약-${masterId}`,
  thumbnailUrl: null,
  hasDetail: true,
  relatedProductName: `마스터-${masterId}`,
  detail: { html: `<p>${masterId}</p>` },
});
const STORE_SRC = (contentId: string): ResolvedSourceContent => ({
  itemId: `store:${contentId}`,
  sourceBadge: '매장 제작',
  baseTitle: `콘텐츠-${contentId}`,
  baseSummary: `요약-${contentId}`,
  thumbnailUrl: null,
  hasDetail: true,
  relatedProductName: null,
  detail: { html: `<p>${contentId}</p>` },
});

/** contentId/masterId 별로 존재 여부를 제어하는 mock adapter. */
function mockAdapter(opts: { missingMasters?: Set<string>; missingContents?: Set<string> } = {}): ContentSourceAdapter {
  return {
    async fetchProductDescription(masterId, language) {
      if (opts.missingMasters?.has(masterId)) return null;
      return O4O_SRC(masterId, language);
    },
    async fetchStoreContent(_org, contentId) {
      if (opts.missingContents?.has(contentId)) return null;
      return STORE_SRC(contentId);
    },
  };
}

const ORG = 'org-1';

describe('resolveContentListItems (content source seam)', () => {
  it('잘못된 config → []', async () => {
    expect(await resolveContentListItems(mockAdapter(), ORG, null)).toEqual([]);
    expect(await resolveContentListItems(mockAdapter(), ORG, { items: 'x' })).toEqual([]);
  });

  it('visible=false item 은 제외, sortOrder 오름차순', async () => {
    const config = {
      items: [
        { sourceType: 'store_content', contentId: 'c2', sortOrder: 20, visible: true },
        { sourceType: 'store_content', contentId: 'c-hidden', sortOrder: 5, visible: false },
        { sourceType: 'store_content', contentId: 'c1', sortOrder: 10, visible: true },
      ],
    };
    const cards = await resolveContentListItems(mockAdapter(), ORG, config);
    expect(cards.map((c) => c.itemId)).toEqual(['store:c1', 'store:c2']);
  });

  it('displayTitle/displaySummary override 우선, 없으면 원본 기본값', async () => {
    const config = {
      items: [
        { sourceType: 'o4o_product_description', masterId: 'm1', language: 'ko', sortOrder: 0, visible: true, displayTitle: '내 제목', displaySummary: '내 요약' },
        { sourceType: 'o4o_product_description', masterId: 'm2', language: 'en', sortOrder: 1, visible: true },
      ],
    };
    const cards = await resolveContentListItems(mockAdapter(), ORG, config);
    expect(cards[0]).toEqual({
      itemId: 'o4o:m1:ko', sourceType: 'o4o_product_description', sourceBadge: 'O4O 표준',
      title: '내 제목', summary: '내 요약', thumbnailUrl: null, hasDetail: true,
      relatedProductName: '마스터-m1', detail: { html: '<p>m1</p>' },
    });
    // override 없으면 baseTitle/baseSummary 그대로.
    expect(cards[1].title).toBe('마스터-m2');
    expect(cards[1].summary).toBe('요약-m2');
    expect(cards[1].itemId).toBe('o4o:m2:en'); // language 통과
  });

  it('원본 미존재/접근불가(adapter null) → 해당 item skip, 나머지 유지', async () => {
    const config = {
      items: [
        { sourceType: 'o4o_product_description', masterId: 'gone', language: 'ko', sortOrder: 0, visible: true },
        { sourceType: 'store_content', contentId: 'c-ok', sortOrder: 1, visible: true },
        { sourceType: 'store_content', contentId: 'c-gone', sortOrder: 2, visible: true },
      ],
    };
    const cards = await resolveContentListItems(
      mockAdapter({ missingMasters: new Set(['gone']), missingContents: new Set(['c-gone']) }),
      ORG,
      config,
    );
    expect(cards.map((c) => c.itemId)).toEqual(['store:c-ok']);
  });

  it('sourceType 별 adapter 메서드 라우팅 + org 전달', async () => {
    const seen: string[] = [];
    const adapter: ContentSourceAdapter = {
      async fetchProductDescription(masterId) { seen.push(`o4o:${masterId}`); return O4O_SRC(masterId, 'ko'); },
      async fetchStoreContent(org, contentId) { seen.push(`store:${org}:${contentId}`); return STORE_SRC(contentId); },
    };
    const config = {
      items: [
        { sourceType: 'o4o_product_description', masterId: 'm9', language: 'ko', sortOrder: 0, visible: true },
        { sourceType: 'store_content', contentId: 'c9', sortOrder: 1, visible: true },
      ],
    };
    await resolveContentListItems(adapter, ORG, config);
    expect(seen).toEqual(['o4o:m9', 'store:org-1:c9']);
  });
});
