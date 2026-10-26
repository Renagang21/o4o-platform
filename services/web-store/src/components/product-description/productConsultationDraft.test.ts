import { describe, expect, it } from 'vitest';
import { newProductConsultation, readProductConsultation } from './productConsultationDraft';
const product = { sourceType: 'local' as const, sourceId: '00000000-0000-4000-8000-000000000001', name: 'Synthetic product' };
describe('product consultation authoring metadata', () => {
 it('roundtrips an editable purpose, language and separately reviewed evidence', () => {
  const value = newProductConsultation(product); value.assist.purpose = 'professional'; value.language = 'ja';
  value.assist.reference = 'Guideline'; value.assist.referenceSource = 'Reference, date'; value.assist.reviewed = true;
  expect(readProductConsultation(JSON.parse(JSON.stringify(value)))).toEqual(value);
 });
 it('never restores unknown schema, invalid identity/language or oversized evidence as a usable context', () => {
  const value = newProductConsultation(product);
  for (const data of [null, {}, { ...value, version: 2 }, { ...value, language: 'toString' },
    { ...value, product: { ...product, sourceId: '../other' } },
    { ...value, assist: { ...value.assist, facts: 'x'.repeat(20001) } }]) expect(readProductConsultation(data)).toBeUndefined();
 });
 it('does not promote empty evidence to reviewed or carry extra authority fields', () => {
  const value = newProductConsultation(product); value.assist.factsReviewed = true;
  expect(readProductConsultation({ ...value, ownerId: 'other-user' })).toEqual(newProductConsultation(product));
 });
});
