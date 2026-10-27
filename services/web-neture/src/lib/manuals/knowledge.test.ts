import { describe, it, expect } from 'vitest';
import { searchManuals, validateManual, parseManualLibrary, MANUAL_LIMITS, type ManualDocument } from './knowledge';
const doc: ManualDocument = { id: 'a'.repeat(64), title: '합성 매뉴얼', program: '합성 프로그램', importedAt: '2026-10-27', uses: 0, reports: {}, pages: [{ page: 1, text: '소개 화면' }, { page: 2, text: '약품 사입 명세서는 거래처와 포장단위, 수량, 포장 단가를 확인합니다.' }, { page: 3, text: '백업은 환경설정 메뉴에서 합니다.' }] };
describe('manual evidence retrieval', () => {
  it('uses only explicitly selected documents and retrieves matching pages with provenance', () => {
    expect(searchManuals([doc], [], '사입 명세서')).toEqual([]);
    const refs = searchManuals([doc], [doc.id], '사입 명세서 포장단위');
    expect(refs[0]).toMatchObject({ manualId: doc.id, page: 2, program: doc.program });
    expect(refs.some(r => r.page === 1)).toBe(false);
    expect(searchManuals([doc], [doc.id], '전혀없는업무')).toEqual([]);
  });
  it('bounds excerpts, deduplicates pages and keeps reports separate from source', () => {
    const corrected = { ...doc, pages: Array.from({ length: 15 }, (_, i) => ({ page: i + 1, text: '사입 포장 단위 '.repeat(500) })), reports: { '1': { state: 'differs' as const, note: '현재 메뉴 이름이 다름' } } };
    const refs = searchManuals([corrected], [doc.id], '사입 포장');
    expect(refs).toHaveLength(4);
    expect(refs.reduce((n, r) => n + r.text.length, 0)).toBeLessThanOrEqual(5600);
    expect(new Set(refs.map(r => r.page)).size).toBe(4);
    expect(refs[0].userReport?.state).toBe('differs');
    expect(refs[0].text).not.toContain('현재 메뉴');
  });
  it('rejects malformed imports and empty/scanned documents rather than claiming readiness', () => {
    expect(() => validateManual({ ...doc, pages: [{ page: 0, text: 'x' }] })).toThrow();
    expect(() => validateManual({ ...doc, pages: [{ page: 1, text: ' ' }] })).toThrow();
    expect(() => validateManual({ ...doc, pages: [doc.pages[0], doc.pages[0]] })).toThrow();
    expect(() => validateManual({ ...doc, id: '../another-account' })).toThrow();
    expect(validateManual({ ...doc, owner: 'forged', verified: true })).not.toHaveProperty('verified');
  });
});


it('round-trips a valid Korean library larger than the individual PDF limit', () => {
  const documents = Array.from({ length: 6 }, (_, i) => ({ ...doc, id: i.toString(16).padStart(64, '0'), pages: [{ page: 1, text: '가'.repeat(700_000) }] }));
  const exported = JSON.stringify({ format: 'o4o-manual-library-v1', documents });
  const bytes = new TextEncoder().encode(exported).byteLength;
  expect(bytes).toBeGreaterThan(MANUAL_LIMITS.bytes);
  expect(bytes).toBeLessThan(MANUAL_LIMITS.libraryBytes);
  expect(parseManualLibrary(exported).map(d => d.pages[0].text.length)).toEqual(Array(6).fill(700_000));
  // JSON escaping can require six bytes for each UTF-16 code unit, including report text.
  const worstCase = MANUAL_LIMITS.documents * (MANUAL_LIMITS.characters * 6 + MANUAL_LIMITS.pages * (300 * 6 + 100) + 4000);
  expect(worstCase).toBeLessThan(MANUAL_LIMITS.libraryBytes);
});
