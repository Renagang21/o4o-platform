import { describe, expect, it } from 'vitest';
import { readPublicDescriptionCatalog } from './catalogAdapter';
const evidence = [{ id: 'e', source_url: 'https://nedrug.mfds.go.kr/example', kind: 'government_authorized_product', sha256: 'a'.repeat(64), currentness: 'retrieved_2026-10-27' }];
const description = { description_key: 'drug:synthetic', name: 'Synthetic', sections: { 'Use': 'Professional reference' }, section_html: { Use: '<table><tbody><tr><td>Reference</td></tr></tbody></table>' }, official_identifiers: { mfds_item_seq: '200610765' }, verified_barcodes: ['8806541001115'], source_evidence_ids: ['e'], source_currentness: 'retrieved_2026-10-27', source_query_rows: [9], private_price: 500 };
const catalog = (descriptions: unknown[]) => ({ format: 'o4o-public-product-descriptions-v1', generated_on: '2026-10-27', evidence, descriptions });
describe('prepared public description file adapter', () => {
 it('preserves source tables and official identifiers but whitelists away POS/private fields', () => {
  const result = readPublicDescriptionCatalog(catalog([description]), 'B2B', 'ko');
  expect(result.entries[0].content).toContain('<table>');
  expect(result.entries[0].identifiers).toEqual({ mfdsItemSeq: '200610765' });
  expect(JSON.stringify(result)).not.toMatch(/source_query_rows|private_price/);
 });
 it('does not turn names into descriptions and labels archived source separately', () => {
  const result = readPublicDescriptionCatalog(catalog([{ ...description, sections: {}, section_html: {}, name: 'No body' }, { ...description, source_currentness: 'o4o_archive_not_current_live_verified' }]), 'STORE', 'ko');
  expect(result.excludedEmpty).toBe(1); expect(result.entries).toHaveLength(1);
  expect(result.entries[0].source).toMatchObject({ currentness: 'archived', checkedOn: null });
 });
 it('rejects missing evidence rather than fabricating a source', () => {
  expect(() => readPublicDescriptionCatalog(catalog([{ ...description, source_evidence_ids: ['missing'] }]), 'B2B', 'ko')).toThrow();
 });
});
