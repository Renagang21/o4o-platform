import { readStoreAiReadiness } from './store-ai-readiness.js';
const entry = (kind = 'product-fact') => ({ key: 'fixture', name: '합성 상품', content: '<p>합성 근거</p>', descriptionType: 'B2B', language: 'ko',
  source: { kind: 'manufacturer', currentness: 'retrieved', references: [{ url: 'https://example.org/evidence' }] },
  aiSections: [{ key: 'fact', title: '성분', kind, text: '합성 근거', referenceUrls: kind === 'unclassified' ? [] : ['https://example.org/evidence'] }] });
it('counts unique masters separately from links, and distinguishes typed, unclassified, legacy and changed evidence', async () => {
  const rows = [
    { masterId: 'a', links: 2, content: '<p>합성 근거</p>', entry: entry() },
    { masterId: 'b', links: 1, content: '<p>합성 근거</p>', entry: entry('unclassified') },
    { masterId: 'c', links: 1, content: '<p>이후 일반 편집</p>', entry: entry() },
    { masterId: 'd', links: 1, content: null, entry: null },
    { masterId: 'a', links: 2, content: '<p>합성 근거</p>', entry: entry() },
  ];
  const query = jest.fn().mockResolvedValueOnce(rows).mockResolvedValueOnce([{ count: 3 }]);
  expect(await readStoreAiReadiness({ query }, 'store', 'ko')).toEqual({ organizationId: 'store', purpose: 'B2B', language: 'ko',
    listingCount: 5, masterCount: 4, localCount: 3, states: { structured: 1, unclassified: 1, legacy: 1, missing: 1 } });
  expect(query.mock.calls[0][1]).toEqual(['store', 'ko']);
});
it('propagates a failed coverage read instead of reporting zero coverage', async () => {
  await expect(readStoreAiReadiness({ query: jest.fn().mockRejectedValue(new Error('unavailable')) }, 'store', 'ko')).rejects.toThrow('unavailable');
});
