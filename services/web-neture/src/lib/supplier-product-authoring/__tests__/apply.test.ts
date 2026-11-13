/**
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 — Draft → 폼 적용 계약 테스트
 */
import { describe, it, expect } from 'vitest';
import { applySupplierProductDraft, descriptionTextToHtml, type SupplierProductDraftTargetForm } from '../apply';
import type { SupplierProductCandidateDraft } from '../types';

const EMPTY_FORM: SupplierProductDraftTargetForm = {
  barcode: '', marketingName: '', brandId: '', brandName: '', manufacturerName: '', specification: '',
  originCountry: '', regulatoryType: 'GENERAL', regulatoryName: '', mfdsPermitNumber: '',
};

const DRAFT: SupplierProductCandidateDraft = {
  name: '홍삼정 골드', barcode: '8801234567890', categoryId: null, brandId: null, brandName: '정관장',
  manufacturerName: '한국인삼공사', specification: '240g', originCountry: '대한민국', regulatoryType: 'HEALTH_FUNCTIONAL',
  drugCategory: null, regulatoryName: '홍삼정 골드', mfdsPermitNumber: null, imageUrl: null, contentImageUrls: [],
  offerDraft: {
    priceGeneral: 45000, consumerReferencePrice: null, consumerShortDescription: '한 줄',
    consumerDetailDescription: '첫 줄\n둘째 줄\n\n셋째 문단', isFeatured: true,
  },
};

describe('applySupplierProductDraft', () => {
  it('fill-empty: 빈 칸만 채우고 사용자 입력은 보존한다', () => {
    const form = { ...EMPTY_FORM, marketingName: '사용자가 적은 이름', extra: 'keep', priceGeneral: '', isFeatured: false };
    const r = applySupplierProductDraft(form, DRAFT, { mode: 'fill-empty', lockRegulatoryType: false, currentDescription: '' });
    expect(r.form.marketingName).toBe('사용자가 적은 이름');
    expect(r.form.barcode).toBe('8801234567890');
    expect(r.form.brandName).toBe('정관장');
    expect(r.form.brandId).toBe('');
    expect(r.form.regulatoryType).toBe('HEALTH_FUNCTIONAL');
    expect(r.form.extra).toBe('keep');
    // 간이 설명 칸에는 간이 설명을 우선 넣는다
    expect(r.description).toBe('<p>한 줄</p>');
    expect(r.changedFields).not.toContain('marketingName');
    expect(r.changedFields).toContain('description');
    // 가격·추천 표시는 Candidate 에 없는 숨은 값이라 적용하지 않는다
    expect(r.form.priceGeneral).toBe('');
    expect(r.form.isFeatured).toBe(false);
    expect(r.changedFields).not.toContain('priceGeneral');
  });

  it('overwrite: AI 값이 있는 칸은 덮어쓰고, 없는(null) 칸은 건드리지 않는다', () => {
    const form = { ...EMPTY_FORM, marketingName: '옛 이름', mfdsPermitNumber: '제2020-1호', priceGeneral: '99', isFeatured: false };
    const r = applySupplierProductDraft(form, DRAFT, { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '<p>기존</p>' });
    expect(r.form.marketingName).toBe('홍삼정 골드');
    expect(r.form.mfdsPermitNumber).toBe('제2020-1호');
    expect(r.form.priceGeneral).toBe('99');
    expect(r.form.isFeatured).toBe(false);
    expect(r.notes.some((n) => n.includes('가격·추천 표시'))).toBe(true);
    expect(r.description).toBe('<p>한 줄</p>');
  });

  it('brandName 이 바뀌면 brandId 를 비우고 안내한다(자동 매칭 금지)', () => {
    const form = { ...EMPTY_FORM, brandId: 'brand-uuid', brandName: '다른 브랜드' };
    const r = applySupplierProductDraft(form, DRAFT, { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '' });
    expect(r.form.brandId).toBe('');
    expect(r.notes.some((n) => n.includes('브랜드'))).toBe(true);
    // 같은 이름이면 유지
    const same = applySupplierProductDraft(
      { ...EMPTY_FORM, brandId: 'brand-uuid', brandName: '정관장' },
      DRAFT,
      { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '' },
    );
    expect(same.form.brandId).toBe('brand-uuid');
  });

  it('regulatoryType: 진입 유형이 잠겨 있으면 미적용 · AI 의 DRUG 는 절대 적용하지 않는다', () => {
    const locked = applySupplierProductDraft(EMPTY_FORM, DRAFT, { mode: 'overwrite', lockRegulatoryType: true, currentDescription: '' });
    expect(locked.form.regulatoryType).toBe('GENERAL');
    expect(locked.notes.some((n) => n.includes('진입 시 선택'))).toBe(true);
    const drug = applySupplierProductDraft(
      EMPTY_FORM,
      { ...DRAFT, regulatoryType: 'DRUG' },
      { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '' },
    );
    expect(drug.form.regulatoryType).toBe('GENERAL');
    expect(drug.notes.some((n) => n.includes('DRUG'))).toBe(true);
  });

  it('categoryId · 이미지 · drugCategory 에는 손대지 않는다(폼에 그런 키가 있어도 그대로)', () => {
    const form = { ...EMPTY_FORM, categoryId: 'cat-1', imageUrl: 'https://o4o/x.png' };
    const r = applySupplierProductDraft(form, DRAFT, { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '' });
    expect(r.form.categoryId).toBe('cat-1');
    expect(r.form.imageUrl).toBe('https://o4o/x.png');
  });

  it('descriptionTextToHtml: 이미 HTML 이면 그대로 · 텍스트는 이스케이프 후 문단화', () => {
    expect(descriptionTextToHtml('<p>a</p>')).toBe('<p>a</p>');
    expect(descriptionTextToHtml('1 < 2 & 3')).toBe('<p>1 &lt; 2 &amp; 3</p>');
    expect(descriptionTextToHtml('  ')).toBe('');
  });

  it('설명: 간이 설명이 없으면 한도 안의 상세 설명을 쓰고, 넘치면 적용하지 않고 안내한다', () => {
    const detailOnly = { ...DRAFT, offerDraft: { ...DRAFT.offerDraft, consumerShortDescription: null } };
    const ok = applySupplierProductDraft(EMPTY_FORM, detailOnly, { mode: 'fill-empty', lockRegulatoryType: false, currentDescription: '' });
    expect(ok.description).toBe('<p>첫 줄<br />둘째 줄</p><p>셋째 문단</p>');

    const long = { ...DRAFT, offerDraft: { ...DRAFT.offerDraft, consumerShortDescription: null, consumerDetailDescription: '가'.repeat(600) } };
    const r = applySupplierProductDraft(EMPTY_FORM, long, { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '<p>기존</p>' });
    expect(r.description).toBeNull();
    expect(r.changedFields).not.toContain('description');
    expect(r.notes.some((n) => n.includes('500자'))).toBe(true);

    // 변환된 HTML 길이 기준 — 텍스트 500자는 <p> 태그 때문에 넘친다
    const edge = { ...DRAFT, offerDraft: { ...DRAFT.offerDraft, consumerShortDescription: '나'.repeat(500), consumerDetailDescription: null } };
    expect(applySupplierProductDraft(EMPTY_FORM, edge, { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '' }).description).toBeNull();

    // 간이 설명이 넘치면 한도 안의 상세 설명으로 대신한다
    const fallback = { ...DRAFT, offerDraft: { ...DRAFT.offerDraft, consumerShortDescription: '다'.repeat(600) } };
    expect(applySupplierProductDraft(EMPTY_FORM, fallback, { mode: 'overwrite', lockRegulatoryType: false, currentDescription: '' }).description)
      .toBe('<p>첫 줄<br />둘째 줄</p><p>셋째 문단</p>');
  });

  it('AI 가 읽은 바코드·허가번호는 확인 필요, 결과가 비어 남은 칸은 미확인으로 알린다', () => {
    const partial = { ...DRAFT, mfdsPermitNumber: '제2024-12호', manufacturerName: null, originCountry: null };
    const r = applySupplierProductDraft(EMPTY_FORM, partial, { mode: 'fill-empty', lockRegulatoryType: false, currentDescription: '' });
    const verify = r.notes.find((n) => n.startsWith('확인 필요'));
    expect(verify).toContain('바코드');
    expect(verify).toContain('허가번호');
    const unconfirmed = r.notes.find((n) => n.startsWith('미확인'));
    expect(unconfirmed).toContain('제조사');
    expect(unconfirmed).toContain('원산지');
    expect(unconfirmed).not.toContain('제품명');

    // 사용자가 이미 입력한 칸은 미확인으로 알리지 않고, 바코드를 적용하지 않았으면 확인 필요도 없다
    const kept = applySupplierProductDraft(
      { ...EMPTY_FORM, barcode: '8800000000000', manufacturerName: '직접 입력', originCountry: '대한민국' },
      partial,
      { mode: 'fill-empty', lockRegulatoryType: false, currentDescription: '' },
    );
    expect(kept.notes.find((n) => n.startsWith('미확인'))).toBeUndefined();
    expect(kept.notes.find((n) => n.startsWith('확인 필요'))).not.toContain('바코드');
  });
});
