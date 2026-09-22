/**
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 — JSON parse / validation 계약 테스트
 */
import { describe, it, expect } from 'vitest';
import { parseSupplierProductCandidateDraft } from '../parse';

const VALID = {
  name: '홍삼정 골드',
  barcode: '8801234567890',
  categoryId: null,
  brandId: null,
  brandName: '정관장',
  manufacturerName: '한국인삼공사',
  specification: '240g',
  originCountry: '대한민국',
  regulatoryType: 'HEALTH_FUNCTIONAL',
  drugCategory: null,
  regulatoryName: '홍삼정 골드',
  mfdsPermitNumber: null,
  imageUrl: null,
  contentImageUrls: [],
  offerDraft: {
    priceGeneral: 45000,
    consumerReferencePrice: 60000,
    consumerShortDescription: '6년근 홍삼 농축액',
    consumerDetailDescription: '첫 줄\n둘째 줄',
    isFeatured: false,
  },
};

describe('parseSupplierProductCandidateDraft — 실패 = 적용 0', () => {
  it('빈 문자열 → EMPTY', () => {
    expect(parseSupplierProductCandidateDraft('   ')).toEqual(expect.objectContaining({ ok: false, code: 'EMPTY' }));
  });
  it('JSON 이 아니면 INVALID_JSON', () => {
    expect(parseSupplierProductCandidateDraft('제품명은 홍삼정입니다')).toEqual(expect.objectContaining({ ok: false, code: 'INVALID_JSON' }));
    expect(parseSupplierProductCandidateDraft('{ name: 홍삼 }')).toEqual(expect.objectContaining({ ok: false, code: 'INVALID_JSON' }));
  });
  it('객체가 아니면 NOT_OBJECT', () => {
    expect(parseSupplierProductCandidateDraft('[1,2]')).toEqual(expect.objectContaining({ ok: false, code: 'NOT_OBJECT' }));
    expect(parseSupplierProductCandidateDraft('"abc"')).toEqual(expect.objectContaining({ ok: false, code: 'NOT_OBJECT' }));
    expect(parseSupplierProductCandidateDraft('null')).toEqual(expect.objectContaining({ ok: false, code: 'NOT_OBJECT' }));
  });
});

describe('parseSupplierProductCandidateDraft — 성공', () => {
  it('정상 JSON 을 그대로 Draft 로 만든다', () => {
    const r = parseSupplierProductCandidateDraft(JSON.stringify(VALID));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.name).toBe('홍삼정 골드');
    expect(r.draft.barcode).toBe('8801234567890');
    expect(r.draft.brandName).toBe('정관장');
    expect(r.draft.regulatoryType).toBe('HEALTH_FUNCTIONAL');
    expect(r.draft.offerDraft.priceGeneral).toBe(45000);
    expect(r.draft.offerDraft.consumerDetailDescription).toBe('첫 줄\n둘째 줄');
    expect(r.warnings).toEqual([]);
  });

  it('json 코드펜스와 앞뒤 설명 문장을 벗겨 낸다', () => {
    const fence = '`'.repeat(3);
    const fenced = `${fence}json\n${JSON.stringify(VALID)}\n${fence}`;
    expect(parseSupplierProductCandidateDraft(fenced).ok).toBe(true);
    const prose = `정리했습니다:\n${JSON.stringify(VALID)}\n확인 부탁드립니다.`;
    expect(parseSupplierProductCandidateDraft(prose).ok).toBe(true);
  });

  it('금지 키(supplierId · masterId · serviceKeys · distributionType · stock · 유효기간)는 제거하고 경고한다', () => {
    const r = parseSupplierProductCandidateDraft(JSON.stringify({
      ...VALID,
      supplierId: 'x', masterId: 'y', productMasterId: 'z', serviceKeys: ['kpa'], distribution_type: 'PUBLIC',
      stockQty: 10, 유효기간: '2027-01', offerDraft: { ...VALID.offerDraft, stock_quantity: 5, serviceKeys: [] },
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = r.draft as unknown as Record<string, unknown>;
    for (const k of ['supplierId', 'masterId', 'productMasterId', 'serviceKeys', 'distribution_type', 'stockQty', '유효기간']) {
      expect(k in d).toBe(false);
    }
    expect('stock_quantity' in (d.offerDraft as object)).toBe(false);
    expect(r.warnings.filter((w) => w.includes('허용되지 않는 항목')).length).toBe(9);
  });

  it('계약에 없는 키는 제거하고 경고한다', () => {
    const r = parseSupplierProductCandidateDraft(JSON.stringify({ ...VALID, sku: 'A1', offerDraft: { ...VALID.offerDraft, discount: 10 } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect('sku' in (r.draft as object)).toBe(false);
    expect(r.warnings).toContain('sku: 계약에 없는 항목이라 제거했습니다.');
    expect(r.warnings).toContain('offerDraft.discount: 계약에 없는 항목이라 제거했습니다.');
  });

  it('AI 의 categoryId · brandId · drugCategory · imageUrl · contentImageUrls 값은 무시한다(항상 null/[])', () => {
    const r = parseSupplierProductCandidateDraft(JSON.stringify({
      ...VALID,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      drugCategory: 'otc',
      imageUrl: 'https://x/y.png',
      contentImageUrls: ['https://x/z.png'],
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.categoryId).toBeNull();
    expect(r.draft.brandId).toBeNull();
    expect(r.draft.drugCategory).toBeNull();
    expect(r.draft.imageUrl).toBeNull();
    expect(r.draft.contentImageUrls).toEqual([]);
    expect(r.warnings.filter((w) => w.includes('AI 값은 사용하지 않습니다')).length).toBe(5);
  });

  it('regulatoryType 은 enum 외 값이면 null + 경고, 소문자는 대문자로 받는다', () => {
    const bad = parseSupplierProductCandidateDraft(JSON.stringify({ ...VALID, regulatoryType: 'FOOD' }));
    expect(bad.ok && bad.draft.regulatoryType).toBeNull();
    expect(bad.ok && bad.warnings.some((w) => w.startsWith('regulatoryType:'))).toBe(true);
    const lower = parseSupplierProductCandidateDraft(JSON.stringify({ ...VALID, regulatoryType: 'cosmetic' }));
    expect(lower.ok && lower.draft.regulatoryType).toBe('COSMETIC');
  });

  it('문자열 상한(name 200 · barcode 64 등)을 넘으면 잘라내고 경고 · 빈 문자열은 null · 숫자는 0 이상만', () => {
    const r = parseSupplierProductCandidateDraft(JSON.stringify({
      ...VALID,
      name: 'a'.repeat(250),
      barcode: '1'.repeat(70),
      brandName: '  ',
      manufacturerName: 42,
      offerDraft: { priceGeneral: '12,000원', consumerReferencePrice: -5, consumerShortDescription: '', consumerDetailDescription: null, isFeatured: 'yes' },
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.name?.length).toBe(200);
    expect(r.draft.barcode?.length).toBe(64);
    expect(r.draft.brandName).toBeNull();
    expect(r.draft.manufacturerName).toBe('42');
    expect(r.draft.offerDraft.priceGeneral).toBe(12000);
    expect(r.draft.offerDraft.consumerReferencePrice).toBeNull();
    expect(r.draft.offerDraft.consumerShortDescription).toBeNull();
    expect(r.draft.offerDraft.isFeatured).toBe(false);
    expect(r.warnings).toContain('name: 200자를 넘어 잘라냈습니다.');
    expect(r.warnings).toContain('barcode: 64자를 넘어 잘라냈습니다.');
  });

  it('name 이 없으면 성공하되 안내 경고를 남긴다(화면에서 직접 입력)', () => {
    const r = parseSupplierProductCandidateDraft(JSON.stringify({ ...VALID, name: null }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.name).toBeNull();
    expect(r.warnings.some((w) => w.startsWith('name:'))).toBe(true);
  });
});
