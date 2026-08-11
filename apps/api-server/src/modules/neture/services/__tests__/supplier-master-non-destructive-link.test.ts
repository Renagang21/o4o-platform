/**
 * WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1
 *
 * 계약:
 *   기존 ProductMaster 연결 → offer 생성/갱신 PASS, ProductMaster UPDATE 0
 *   신규 제품 등록          → ProductMaster INSERT + 확장 필드 적용
 *
 * 제품군 예외를 두지 않는다(DRUG / HEALTH_FUNCTIONAL / QUASI_DRUG / MEDICAL_DEVICE / COSMETIC / GENERAL).
 */
import {
  resolveMasterWriteFields,
  SUPPLIER_WRITABLE_MASTER_FIELDS,
} from '../master-link-policy.js';

const SUPPLIER_INPUT = {
  name: '공급자가 붙인 판매명',
  manufacturerName: '공급자 입력 제조사',
  categoryId: 'cat-supplier',
  brandId: 'brand-supplier',
  specification: '공급자 규격',
  originCountry: '중국',
  tags: ['공급자태그'],
  regulatoryType: 'GENERAL',
};

describe('기존 master 연결 — ProductMaster 기준정보 불변', () => {
  it('created=false 면 적용 필드 0', () => {
    const d = resolveMasterWriteFields(false, SUPPLIER_INPUT);
    expect(d.mode).toBe('existing');
    expect(Object.keys(d.masterFieldUpdates)).toHaveLength(0);
  });

  it('공급자 입력 name 이 master 와 달라도 name 을 쓰지 않는다', () => {
    const d = resolveMasterWriteFields(false, { name: '전혀 다른 이름' });
    expect(d.masterFieldUpdates).not.toHaveProperty('name');
    expect(d.ignoredFields).toContain('name');
  });

  it('category / brand / specification / originCountry / tags 전부 불변', () => {
    const d = resolveMasterWriteFields(false, SUPPLIER_INPUT);
    for (const f of ['categoryId', 'brandId', 'specification', 'originCountry', 'tags'] as const) {
      expect(d.masterFieldUpdates).not.toHaveProperty(f);
      expect(d.ignoredFields).toContain(f);
    }
  });

  it('manufacturerName / regulatoryType 은 애초에 공급자 쓰기 대상이 아니다 (catalog immutable guard 와 정합)', () => {
    const d = resolveMasterWriteFields(false, SUPPLIER_INPUT);
    expect(d.masterFieldUpdates).not.toHaveProperty('manufacturerName');
    expect(d.masterFieldUpdates).not.toHaveProperty('regulatoryType');
    expect(SUPPLIER_WRITABLE_MASTER_FIELDS).not.toContain('manufacturerName' as never);
    expect(SUPPLIER_WRITABLE_MASTER_FIELDS).not.toContain('regulatoryType' as never);
  });

  it('created 판정 불가(undefined) 면 보수적으로 기존 master 로 본다', () => {
    const d = resolveMasterWriteFields(undefined, SUPPLIER_INPUT);
    expect(d.mode).toBe('existing');
    expect(Object.keys(d.masterFieldUpdates)).toHaveLength(0);
  });

  // 제품군별 회귀 — 화장품만 예외 처리하지 않는다
  it.each(['DRUG', 'HEALTH_FUNCTIONAL', 'QUASI_DRUG', 'MEDICAL_DEVICE', 'COSMETIC', 'GENERAL'])(
    '%s 제품군에서도 기존 master 는 불변',
    (regulatoryType) => {
      const d = resolveMasterWriteFields(false, { ...SUPPLIER_INPUT, regulatoryType });
      expect(Object.keys(d.masterFieldUpdates)).toHaveLength(0);
    },
  );
});

describe('신규 제품 등록 — 기존 동작 유지', () => {
  it('created=true 면 확장 필드를 적용한다', () => {
    const d = resolveMasterWriteFields(true, SUPPLIER_INPUT);
    expect(d.mode).toBe('new');
    expect(d.masterFieldUpdates).toEqual({
      name: SUPPLIER_INPUT.name,
      categoryId: SUPPLIER_INPUT.categoryId,
      brandId: SUPPLIER_INPUT.brandId,
      specification: SUPPLIER_INPUT.specification,
      originCountry: SUPPLIER_INPUT.originCountry,
      tags: SUPPLIER_INPUT.tags,
    });
    expect(d.ignoredFields).toHaveLength(0);
  });

  it('제공되지 않은 필드는 적용하지 않는다 (undefined 로 덮어쓰기 금지)', () => {
    const d = resolveMasterWriteFields(true, { name: '신규 상품' });
    expect(d.masterFieldUpdates).toEqual({ name: '신규 상품' });
  });

  it('입력이 없으면 적용 0 (barcode 유무와 무관)', () => {
    expect(resolveMasterWriteFields(true, undefined).masterFieldUpdates).toEqual({});
    expect(resolveMasterWriteFields(true, {}).masterFieldUpdates).toEqual({});
  });
});
