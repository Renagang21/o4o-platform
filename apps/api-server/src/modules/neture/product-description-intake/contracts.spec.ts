import { barcodeForms, normalizeProductBarcode, prepareDescriptionEntries } from './contracts.js';
const entry = { key: 'synthetic', name: 'Synthetic product', content: '<p>Ingredient and use</p>', barcodes: ['08806541001115'], source: { kind: 'government', currentness: 'retrieved', checkedOn: '2026-10-27', references: [{ url: 'https://nedrug.mfds.go.kr/example' }] } };
describe('public description intake boundary', () => {
  it('validates GTIN and normalizes filler zeros and GS1 AI(01), preserving real packaging indicators', () => {
    expect(normalizeProductBarcode('08806541001115')).toBe('8806541001115');
    expect(normalizeProductBarcode('(01)08806541001115(17)271231')).toBe('8806541001115');
    expect(normalizeProductBarcode(']d2010880654100111517271231')).toBe('8806541001115');
    expect(normalizeProductBarcode('18806541001112')).toBe('18806541001112');
    expect(barcodeForms('8806541001115')).not.toContain('18806541001112');
    for (const code of ['1436', '8806541001114', 'POS000001', '8806541001115x']) expect(normalizeProductBarcode(code)).toBeNull();
  });
  it('does not store empty, image-only or script-only descriptions', () => {
    const result = prepareDescriptionEntries({ entries: ['<p>&nbsp;&#8203;</p>', '<img src="https://example.com/image">', '<script>bad()</script>'].map(content => ({ ...entry, content })) });
    expect(result).toEqual({ entries: [], excludedEmpty: 3 });
  });
  it('sanitizes scripts and attributes without censoring professional medical terms', () => {
    const result = prepareDescriptionEntries({ entries: [{ ...entry, content: '<p onclick="bad()">진단: 알레르기 질환 참고</p><script>bad()</script>' }] });
    expect(result.entries[0].content).toBe('<p>진단: 알레르기 질환 참고</p>');
    expect(result.entries[0].barcodes).toEqual(['8806541001115']);
  });
  it('requires actual public evidence and rejects unsafe URLs, false government sources and unknown fields', () => {
    for (const changed of [
      { ...entry, source: { ...entry.source, references: [] } },
      { ...entry, source: { ...entry.source, references: [{ url: 'javascript:bad()' }] } },
      { ...entry, source: { ...entry.source, references: [{ url: 'https://mfds.go.kr.evil.example/file' }] } },
      { ...entry, organizationId: 'forged' }, { ...entry, barcodes: ['8806541001114'] },
    ]) expect(() => prepareDescriptionEntries({ entries: [changed] })).toThrow();
  });
});
