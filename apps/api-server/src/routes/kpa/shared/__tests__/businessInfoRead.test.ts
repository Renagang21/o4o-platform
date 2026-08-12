/**
 * WO-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1
 *
 * 읽기 정렬 규칙 고정: canonical 우선 · legacy fallback · 빈 문자열은 "부재".
 * WO 검증 항목 1~5 (canonical 만 / legacy 만 / 양쪽 / canonical 빈 문자열 / 둘 다 없음) 를 그대로 대응한다.
 * 개인정보를 피하기 위해 모든 값은 합성 문자열이다.
 */

import { resolveKpaBusinessContact } from '../businessInfoRead.js';

const CANONICAL = 'CANONICAL-ADDR';
const LEGACY = 'LEGACY-ADDR';
const STRUCTURED = 'STRUCTURED-ADDR';

describe('resolveKpaBusinessContact — 주소', () => {
  it('1) canonical 키만 있으면 canonical 을 쓴다', () => {
    const r = resolveKpaBusinessContact({ zipCode: '11111', address: CANONICAL, address2: 'C2' });
    expect(r).toMatchObject({ zipCode: '11111', address: CANONICAL, address2: 'C2' });
  });

  it('2) legacy 키만 있으면 legacy 로 fallback 한다 (기존 빈칸 증상 해소)', () => {
    const r = resolveKpaBusinessContact({ businessAddress: LEGACY, businessAddressDetail: 'L2' });
    expect(r.address).toBe(LEGACY);
    expect(r.address2).toBe('L2');
  });

  it('2-b) 구조화 storeAddress 만 있으면 그것으로 fallback 한다', () => {
    const r = resolveKpaBusinessContact({
      storeAddress: { zipCode: '33333', baseAddress: STRUCTURED, detailAddress: 'S2' },
    });
    expect(r).toMatchObject({ zipCode: '33333', address: STRUCTURED, address2: 'S2' });
  });

  it('3) 양쪽 키가 모두 있으면 canonical 이 legacy 를 이긴다', () => {
    const r = resolveKpaBusinessContact({
      address: CANONICAL,
      address2: 'C2',
      businessAddress: LEGACY,
      businessAddressDetail: 'L2',
      storeAddress: { baseAddress: STRUCTURED, detailAddress: 'S2' },
    });
    expect(r.address).toBe(CANONICAL);
    expect(r.address2).toBe('C2');
  });

  it('4) canonical 이 빈 문자열이면 유효한 legacy 값을 가리지 않는다', () => {
    const r = resolveKpaBusinessContact({
      address: '',
      address2: '   ',
      businessAddress: LEGACY,
      businessAddressDetail: 'L2',
    });
    expect(r.address).toBe(LEGACY);
    expect(r.address2).toBe('L2');
  });

  it('4-b) legacy 도 빈 문자열이면 구조화 값까지 내려간다', () => {
    const r = resolveKpaBusinessContact({
      address: '',
      businessAddress: '',
      storeAddress: { baseAddress: STRUCTURED },
    });
    expect(r.address).toBe(STRUCTURED);
  });

  it('5) 두 값이 모두 없으면 null 이다', () => {
    expect(resolveKpaBusinessContact({})).toEqual({
      zipCode: null,
      address: null,
      address2: null,
      pharmacyPhone: null,
    });
  });

  it('5-b) businessInfo 자체가 null / 비객체여도 안전하게 null 을 반환한다', () => {
    const empty = { zipCode: null, address: null, address2: null, pharmacyPhone: null };
    expect(resolveKpaBusinessContact(null)).toEqual(empty);
    expect(resolveKpaBusinessContact(undefined)).toEqual(empty);
    expect(resolveKpaBusinessContact('not-an-object')).toEqual(empty);
  });
});

describe('resolveKpaBusinessContact — 약국 전화', () => {
  it('canonical metadata.pharmacy_phone 를 우선한다', () => {
    const r = resolveKpaBusinessContact({
      metadata: { pharmacy_phone: '02-000-0001' },
      pharmacyPhone: '02-000-0002',
    });
    expect(r.pharmacyPhone).toBe('02-000-0001');
  });

  it('공통 운영자 콘솔이 쓴 legacy pharmacyPhone 으로 fallback 한다', () => {
    expect(resolveKpaBusinessContact({ pharmacyPhone: '02-000-0002' }).pharmacyPhone).toBe('02-000-0002');
  });

  it('canonical 이 빈 문자열이면 legacy 를 가리지 않는다', () => {
    const r = resolveKpaBusinessContact({ metadata: { pharmacy_phone: '' }, pharmacyPhone: '02-000-0002' });
    expect(r.pharmacyPhone).toBe('02-000-0002');
  });

  it('대표 phone 은 약국 전화로 승격하지 않는다 (범위 확장 금지)', () => {
    expect(resolveKpaBusinessContact({ phone: '010-0000-0000' }).pharmacyPhone).toBeNull();
  });
});

describe('resolveKpaBusinessContact — read-only 보장', () => {
  it('원본 businessInfo 객체를 변경하지 않는다', () => {
    const biz = {
      address: '',
      businessAddress: LEGACY,
      metadata: { pharmacy_phone: '' },
      pharmacyPhone: '02-000-0002',
      storeAddress: { baseAddress: STRUCTURED },
    };
    const snapshot = JSON.stringify(biz);

    resolveKpaBusinessContact(biz);

    expect(JSON.stringify(biz)).toBe(snapshot);
  });

  it('범위 밖 필드(사업자번호·대표자 등)는 결과에 포함하지 않는다', () => {
    const r = resolveKpaBusinessContact({ businessNumber: '000-00-00000', ceoName: 'X', address: CANONICAL });
    expect(Object.keys(r).sort()).toEqual(['address', 'address2', 'pharmacyPhone', 'zipCode']);
  });
});
