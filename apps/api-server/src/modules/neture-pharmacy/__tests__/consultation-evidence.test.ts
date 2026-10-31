import { approvedAiSupportSources, evidenceExcerpt } from '../services/consultation-evidence.js';

const section = (kind: string, title: string, text = '확인된 원문') => ({ key: title, kind, title, text, referenceUrls: ['https://example.org/source'] });
const ai = (sections: unknown[]) => ({ state: 'structured', description: { revision: 'fixture-version', source: { checkedOn: '2026-10-31', currentness: 'retrieved' }, sections } }) as any;
it('keeps counseling support distinct and excludes unclassified or non-http sources', () => {
  const sources = approvedAiSupportSources(ai([section('product-fact', '성분'), section('counseling-support', '상담'), section('unclassified', '미분류'),
    { ...section('professional-reference', '위험 링크'), referenceUrls: ['javascript:alert(1)'] }]), '성분');
  expect(sources.map(s => s.kind)).toEqual(['product-fact', 'counseling-support']);
  expect(sources[0]).toMatchObject({ urls: ['https://example.org/source'], checkedOn: '2026-10-31', revision: 'fixture-version' });
});
it('does not lose the later caution and selects relevant sentences within the budget', () => {
  const sections = Array.from({ length: 12 }, (_, i) => section('product-fact', `일반 ${i}`));
  sections.push(section('professional-reference', '주의사항', '상호작용을 확인하세요.'));
  const sources = approvedAiSupportSources(ai(sections), '상호작용');
  expect(sources[0].title).toContain('주의사항');
  expect(sources.reduce((n, s) => n + s.text.length, 0)).toBeLessThanOrEqual(18000);
  expect(sources.every(s => s.text.length <= 5000)).toBe(true);
});
it('never turns a legacy approved HTML body into typed product evidence', () => {
  expect(approvedAiSupportSources({ state: 'legacy', description: { sections: [section('unclassified', '기존')] } } as any)).toEqual([]);
});
it('does not cut a decimal dose or negation to fit a source budget', () => {
  expect(evidenceExcerpt('0.5 mg은 복용하지 마세요.', 20)).toBe('0.5 mg은 복용하지 마세요.');
  expect(evidenceExcerpt('0.5 mg은 복용하지 마세요.', 5)).toBe('');
});
