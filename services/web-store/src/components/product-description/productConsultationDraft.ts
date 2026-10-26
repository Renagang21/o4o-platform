import type { ProductDescriptionPurpose } from '@o4o/store-ui-core';

export interface DescriptionAssistDraft {
  purpose: ProductDescriptionPurpose;
  facts: string;
  factSource: string;
  factsReviewed: boolean;
  reference: string;
  referenceSource: string;
  reviewed: boolean;
}
export interface ProductConsultationDraft {
  version: 1;
  product: { sourceType: 'listing' | 'local'; sourceId: string; name: string };
  language: 'ko' | 'en' | 'ja' | 'zh';
  assist: DescriptionAssistDraft;
}
export const emptyDescriptionAssist: DescriptionAssistDraft = {
  purpose: 'ai-support', facts: '', factSource: '', factsReviewed: false,
  reference: '', referenceSource: '', reviewed: false,
};
export const consultationLanguages = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어' } as const;
export function newProductConsultation(product: ProductConsultationDraft['product']): ProductConsultationDraft {
  return { version: 1, product: { sourceType: product.sourceType, sourceId: product.sourceId, name: product.name }, language: 'ko', assist: { ...emptyDescriptionAssist } };
}
/** Authoring metadata only. Product access/link authority always belongs to the existing server API. */
export function readProductConsultation(value: unknown): ProductConsultationDraft | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as ProductConsultationDraft, a = v.assist, p = v.product;
  if (v.version !== 1 || !p || !['listing', 'local'].includes(p.sourceType) ||
    typeof p.sourceId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(p.sourceId) ||
    typeof p.name !== 'string' || p.name.length > 500 || !Object.prototype.hasOwnProperty.call(consultationLanguages, v.language) || !a ||
    !['professional', 'ai-support', 'consumer-qr'].includes(a.purpose)) return;
  if (![a.facts, a.reference].every(s => typeof s === 'string' && s.length <= 20000) ||
    ![a.factSource, a.referenceSource].every(s => typeof s === 'string' && s.length <= 1000) ||
    ![a.factsReviewed, a.reviewed].every(s => typeof s === 'boolean')) return;
  return { version: 1, product: { sourceType: p.sourceType, sourceId: p.sourceId, name: p.name },
    language: v.language, assist: { purpose: a.purpose, facts: a.facts, factSource: a.factSource,
      factsReviewed: !!a.facts.trim() && !!a.factSource.trim() && a.factsReviewed,
      reference: a.reference, referenceSource: a.referenceSource,
      reviewed: !!a.reference.trim() && !!a.referenceSource.trim() && a.reviewed } };
}
