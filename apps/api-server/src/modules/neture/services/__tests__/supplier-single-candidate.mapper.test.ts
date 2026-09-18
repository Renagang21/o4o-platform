/**
 * WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1 §6.1 mapper 단위테스트
 */
import {
  validateSupplierSingleCandidateBody,
  buildSupplierSingleCandidateInput,
  deriveSupplierCandidateProductType,
  SUPPLIER_SINGLE_CANDIDATE_SOURCE_LABEL,
  type ValidatedSupplierSingleCandidate,
} from '../supplier-single-candidate.mapper.js';

const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-19T00:00:00.000Z');

function valid(body: Record<string, unknown>): ValidatedSupplierSingleCandidate {
  const r = validateSupplierSingleCandidateBody(body);
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${r.message}`);
  return r.value;
}

function fail(body: unknown): string {
  const r = validateSupplierSingleCandidateBody(body);
  if (r.ok) throw new Error('expected failure');
  return r.code;
}

describe('validateSupplierSingleCandidateBody', () => {
  it('name 빈 값 → CANDIDATE_NAME_REQUIRED (undefined · 공백 · 비객체 body)', () => {
    expect(fail({})).toBe('CANDIDATE_NAME_REQUIRED');
    expect(fail({ name: '   ' })).toBe('CANDIDATE_NAME_REQUIRED');
    expect(fail(null)).toBe('CANDIDATE_NAME_REQUIRED');
    expect(fail('string')).toBe('CANDIDATE_NAME_REQUIRED');
  });

  it('한글 별칭 regulatoryType → INVALID_REGULATORY_TYPE · 영문 코드는 대소문자 무관 통과 · 미지정은 GENERAL', () => {
    expect(fail({ name: 'A', regulatoryType: '일반' })).toBe('INVALID_REGULATORY_TYPE');
    expect(fail({ name: 'A', regulatoryType: '의약품' })).toBe('INVALID_REGULATORY_TYPE');
    expect(valid({ name: 'A', regulatoryType: 'cosmetic' }).regulatoryType).toBe('COSMETIC');
    expect(valid({ name: 'A' }).regulatoryType).toBe('GENERAL');
    expect(valid({ name: 'A', regulatoryType: '' }).regulatoryType).toBe('GENERAL');
  });

  it('DRUG + drugCategory 없음/부정확 → DRUG_CATEGORY_REQUIRED · DRUG 아니면 drugCategory null 로 무시', () => {
    expect(fail({ name: 'A', regulatoryType: 'DRUG' })).toBe('DRUG_CATEGORY_REQUIRED');
    expect(fail({ name: 'A', regulatoryType: 'DRUG', drugCategory: 'foo' })).toBe('DRUG_CATEGORY_REQUIRED');
    expect(valid({ name: 'A', regulatoryType: 'DRUG', drugCategory: 'OTC' }).drugCategory).toBe('otc');
    expect(valid({ name: 'A', regulatoryType: 'GENERAL', drugCategory: 'otc' }).drugCategory).toBeNull();
    expect(valid({ name: 'A', regulatoryType: 'QUASI_DRUG', drugCategory: 'quasi_drug' }).drugCategory).toBeNull();
  });

  it('priceGeneral 음수/문자 → INVALID_PRICE · 콤마·원 문자열은 숫자로 · 빈 값은 null', () => {
    expect(fail({ name: 'A', offerDraft: { priceGeneral: -1 } })).toBe('INVALID_PRICE');
    expect(fail({ name: 'A', offerDraft: { priceGeneral: 'abc' } })).toBe('INVALID_PRICE');
    expect(fail({ name: 'A', offerDraft: { consumerReferencePrice: 'x' } })).toBe('INVALID_PRICE');
    expect(valid({ name: 'A', offerDraft: { priceGeneral: '12,000원' } }).offerDraft.priceGeneral).toBe(12000);
    expect(valid({ name: 'A', offerDraft: { priceGeneral: '' } }).offerDraft.priceGeneral).toBeNull();
    expect(valid({ name: 'A' }).offerDraft.priceGeneral).toBeNull();
  });

  it.each([
    ['supplierId', { name: 'A', supplierId: 'x' }],
    ['supplier_id', { name: 'A', supplier_id: 'x' }],
    ['distributionType', { name: 'A', distributionType: 'PUBLIC' }],
    ['serviceKeys', { name: 'A', serviceKeys: ['kpa'] }],
    ['stockQty', { name: 'A', stockQty: 3 }],
    ['stockQuantity(offerDraft)', { name: 'A', offerDraft: { stockQuantity: 3 } }],
    ['lot', { name: 'A', lot: 'L1' }],
    ['유효기간', { name: 'A', 유효기간: '2027-01-01' }],
    ['expiry_date(offerDraft)', { name: 'A', offerDraft: { expiry_date: '2027-01-01' } }],
    ['SERIAL (대문자)', { name: 'A', SERIAL: '1' }],
  ])('금지 키 %s → FORBIDDEN_FIELD (name 검사보다 먼저)', (_label, body) => {
    expect(fail(body)).toBe('FORBIDDEN_FIELD');
    expect(fail({ ...body, name: '' })).toBe('FORBIDDEN_FIELD');
  });

  it('categoryId 는 uuid 형식만 · imageUrl 은 http(s) 만', () => {
    expect(fail({ name: 'A', categoryId: 'not-a-uuid' })).toBe('INVALID_CATEGORY_ID');
    expect(valid({ name: 'A', categoryId: SUPPLIER_ID }).categoryId).toBe(SUPPLIER_ID);
    expect(fail({ name: 'A', imageUrl: 'ftp://x/y.png' })).toBe('INVALID_URL');
    expect(fail({ name: 'A', imageUrl: 'javascript:alert(1)' })).toBe('INVALID_URL');
    expect(valid({ name: 'A', imageUrl: 'https://cdn.example.com/a.png' }).imageUrl).toBe('https://cdn.example.com/a.png');
  });

  it('길이 초과 → FIELD_TOO_LONG', () => {
    expect(fail({ name: 'A'.repeat(201) })).toBe('FIELD_TOO_LONG');
    expect(fail({ name: 'A', offerDraft: { consumerShortDescription: 'x'.repeat(501) } })).toBe('FIELD_TOO_LONG');
  });

  it('제조사 · 브랜드 공백 → null (합성 없음) · 문자열은 trim', () => {
    const v = valid({ name: '  상품  ', manufacturerName: '   ', brandName: ' 브랜드 ' });
    expect(v.name).toBe('상품');
    expect(v.manufacturerName).toBeNull();
    expect(v.brandName).toBe('브랜드');
  });

  it('바코드: 공백 → null · 하이픈 포함 → sanitize', () => {
    expect(valid({ name: 'A', barcode: '  ' }).barcode).toBeNull();
    expect(valid({ name: 'A', barcode: '880-1234-567890' }).barcode).toBe('8801234567890');
  });

  it('isFeatured 는 true 일 때만 true', () => {
    expect(valid({ name: 'A', offerDraft: { isFeatured: true } }).offerDraft.isFeatured).toBe(true);
    expect(valid({ name: 'A', offerDraft: { isFeatured: 'yes' } }).offerDraft.isFeatured).toBe(false);
    expect(valid({ name: 'A' }).offerDraft.isFeatured).toBe(false);
  });
});

describe('buildSupplierSingleCandidateInput', () => {
  const base = valid({
    name: '테스트 상품',
    brandName: '브랜드',
    manufacturerName: '제조사',
    specification: '30정',
    offerDraft: { priceGeneral: 5000, consumerShortDescription: '짧은 설명' },
  });

  it('고정 필드: serviceKey neture · organizationId/sourceId null · supplier_web · neture-supplier-single · submittedBy 는 감사 정보', () => {
    const input = buildSupplierSingleCandidateInput(base, { supplierId: SUPPLIER_ID, submittedBy: USER_ID, now: NOW });
    expect(input.serviceKey).toBe('neture');
    expect(input.organizationId).toBeNull();
    expect(input.sourceId).toBeNull();
    expect(input.sourceType).toBe('supplier_web');
    expect(input.sourceLabel).toBe(SUPPLIER_SINGLE_CANDIDATE_SOURCE_LABEL);
    expect(input.submittedBy).toBe(USER_ID);
    expect(input.candidateName).toBe('테스트 상품');
    expect(input.candidateBrand).toBe('브랜드');
    expect(input.candidateManufacturer).toBe('제조사');
    expect(input.candidateSpec).toBe('30정');
    expect(input.candidateCategory).toBeNull();
    expect(input.candidateUnit).toBeNull();
    expect(input.candidatePrice).toBe(5000);
  });

  it('rawPayload.supplierId 는 ctx 값이다 (body 에 없음) · source=supplier_single · submittedAt ISO · offerDraft 보존', () => {
    const input = buildSupplierSingleCandidateInput(base, { supplierId: SUPPLIER_ID, submittedBy: USER_ID, now: NOW });
    const raw = input.rawPayload as Record<string, unknown>;
    expect(raw.supplierId).toBe(SUPPLIER_ID);
    expect(raw.source).toBe('supplier_single');
    expect(raw.submittedAt).toBe(NOW.toISOString());
    expect(raw.offerDraft).toEqual({
      priceGeneral: 5000,
      consumerReferencePrice: null,
      consumerShortDescription: '짧은 설명',
      consumerDetailDescription: null,
      isFeatured: false,
    });
    expect(raw).not.toHaveProperty('distributionType');
    expect(raw).not.toHaveProperty('serviceKeys');
    expect(raw).not.toHaveProperty('stockQty');
  });

  it('13자리 숫자 → EAN13 · 8/12/14자리 → GTIN · 영숫자 → UNKNOWN + 값 보존 · 없음 → null/null', () => {
    const with13 = buildSupplierSingleCandidateInput(valid({ name: 'A', barcode: '8801234567890' }), { supplierId: SUPPLIER_ID, submittedBy: null });
    expect(with13.identifierType).toBe('EAN13');
    expect(with13.identifierValue).toBe('8801234567890');

    for (const code of ['12345678', '123456789012', '12345678901234']) {
      const r = buildSupplierSingleCandidateInput(valid({ name: 'A', barcode: code }), { supplierId: SUPPLIER_ID, submittedBy: null });
      expect(r.identifierType).toBe('GTIN');
      expect(r.identifierValue).toBe(code);
    }

    const hyphen = buildSupplierSingleCandidateInput(valid({ name: 'A', barcode: '880-1234-567890' }), { supplierId: SUPPLIER_ID, submittedBy: null });
    expect(hyphen.identifierType).toBe('EAN13');
    expect(hyphen.identifierValue).toBe('8801234567890');

    const alnum = buildSupplierSingleCandidateInput(valid({ name: 'A', barcode: 'ABC-001' }), { supplierId: SUPPLIER_ID, submittedBy: null });
    expect(alnum.identifierType).toBe('UNKNOWN');
    expect(alnum.identifierValue).toBe('ABC-001'); // 원형 보존 · 정규화는 createCandidate 책임

    const none = buildSupplierSingleCandidateInput(valid({ name: 'A' }), { supplierId: SUPPLIER_ID, submittedBy: null });
    expect(none.identifierType).toBeNull();
    expect(none.identifierValue).toBeNull();
  });

  it('제조사 없음 → candidateManufacturer null (합성 없음)', () => {
    const r = buildSupplierSingleCandidateInput(valid({ name: 'A' }), { supplierId: SUPPLIER_ID, submittedBy: null });
    expect(r.candidateManufacturer).toBeNull();
  });

  it.each([
    ['GENERAL', null, 'non_drug', null, false],
    ['COSMETIC', null, 'non_drug', null, false],
    ['HEALTH_FUNCTIONAL', null, 'non_drug', null, false],
    ['MEDICAL_DEVICE', null, 'non_drug', null, false],
    ['QUASI_DRUG', null, 'quasi_drug', 'quasi_drug', false],
    ['DRUG', 'otc', 'otc_drug', 'otc', false],
    ['DRUG', 'rx', 'rx_drug', 'rx', true],
  ] as const)('product_type 파생 %s/%s → %s · drug_category %s · rx %s (bulk BULK_TYPE_MAP 역방향)', (rt, dc, expectedType, expectedDc, rx) => {
    expect(deriveSupplierCandidateProductType(rt, dc)).toBe(expectedType);
    const r = buildSupplierSingleCandidateInput(
      valid({ name: 'A', regulatoryType: rt, drugCategory: dc ?? undefined }),
      { supplierId: SUPPLIER_ID, submittedBy: null },
    );
    const raw = r.rawPayload as Record<string, unknown>;
    expect(raw.product_type).toBe(expectedType);
    expect(raw.drug_category).toBe(expectedDc);
    expect(raw.rx).toBe(rx);
    expect(raw.regulatoryType).toBe(rt);
  });
});
