/**
 * WO-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1
 *
 * 승인 시 `users.businessInfo` → `organizations` 주소·약국 전화 write plan 계약.
 * WO 검증 항목 1~8 을 이 파일에서 고정한다.
 * 모든 값은 개인정보가 아닌 합성 문자열이다.
 */

import { planKpaOrganizationContactSync } from '../organizationContactSync.js';

/** 신규 생성 직후 organization — 전 컬럼 비어 있음. */
const NEW_ORG = { address: null, address_detail: null, phone: null };

describe('planKpaOrganizationContactSync — 신규 organization 초기화', () => {
  it('1) canonical 키만 있는 신규 승인', () => {
    const plan = planKpaOrganizationContactSync(
      { address: 'CANON', address2: 'C2', zipCode: '11111', metadata: { pharmacy_phone: '02-000-0001' } },
      NEW_ORG,
    );
    expect(plan.address).toBe('CANON C2');
    expect(plan.addressDetail).toEqual({ zipCode: '11111', baseAddress: 'CANON', detailAddress: 'C2' });
    expect(plan.phone).toBe('02-000-0001');
    expect(plan.hasChanges).toBe(true);
  });

  it('2) legacy 키만 있는 신규 승인', () => {
    const plan = planKpaOrganizationContactSync(
      { businessAddress: 'LEGACY', businessAddressDetail: 'L2', pharmacyPhone: '02-000-0002' },
      NEW_ORG,
    );
    expect(plan.address).toBe('LEGACY L2');
    expect(plan.addressDetail).toEqual({ baseAddress: 'LEGACY', detailAddress: 'L2' });
    expect(plan.phone).toBe('02-000-0002');
  });

  it('3) 양쪽 값이 다르면 canonical 우선', () => {
    const plan = planKpaOrganizationContactSync(
      {
        address: 'CANON', businessAddress: 'LEGACY',
        metadata: { pharmacy_phone: '02-000-0001' }, pharmacyPhone: '02-000-0002',
      },
      NEW_ORG,
    );
    expect(plan.address).toBe('CANON');
    expect(plan.addressDetail).toEqual({ baseAddress: 'CANON' });
    expect(plan.phone).toBe('02-000-0001');
  });

  it('4) canonical 이 공백이면 유효한 legacy 값을 쓴다', () => {
    const plan = planKpaOrganizationContactSync(
      {
        address: '   ', businessAddress: 'LEGACY',
        address2: '', businessAddressDetail: 'L2',
        metadata: { pharmacy_phone: '' }, pharmacyPhone: '02-000-0002',
      },
      NEW_ORG,
    );
    expect(plan.address).toBe('LEGACY L2');
    expect(plan.addressDetail).toEqual({ baseAddress: 'LEGACY', detailAddress: 'L2' });
    expect(plan.phone).toBe('02-000-0002');
  });

  it('5) 값이 없으면 임의 값을 만들지 않는다', () => {
    const plan = planKpaOrganizationContactSync({ businessNumber: '000-00-00000' }, NEW_ORG);
    expect(plan).toEqual({ address: null, addressDetail: null, phone: null, hasChanges: false });
  });

  it('5-b) businessInfo 자체가 없어도 안전하다', () => {
    expect(planKpaOrganizationContactSync(null, NEW_ORG).hasChanges).toBe(false);
    expect(planKpaOrganizationContactSync(undefined, null).hasChanges).toBe(false);
  });

  it('6) storeAddress 만 있는 회원도 우편번호까지 초기화된다', () => {
    const plan = planKpaOrganizationContactSync(
      { storeAddress: { zipCode: '22222', baseAddress: 'STORE', detailAddress: 'S2' } },
      NEW_ORG,
    );
    expect(plan.address).toBe('STORE S2');
    expect(plan.addressDetail).toEqual({ zipCode: '22222', baseAddress: 'STORE', detailAddress: 'S2' });
  });

  it('대표 전화(phone)는 약국 전화로 승격되지 않는다', () => {
    const plan = planKpaOrganizationContactSync({ phone: '02-999-9999' }, NEW_ORG);
    expect(plan.phone).toBeNull();
    expect(plan.hasChanges).toBe(false);
  });
});

describe('planKpaOrganizationContactSync — 기존 organization 보존', () => {
  it('7) 기존 유효 값은 덮어쓰지 않는다', () => {
    const plan = planKpaOrganizationContactSync(
      { address: 'CANON', address2: 'C2', zipCode: '11111', metadata: { pharmacy_phone: '02-000-0001' } },
      {
        address: 'OPERATOR-EDITED',
        address_detail: { zipCode: '33333', baseAddress: 'OP-BASE', detailAddress: 'OP-DETAIL' },
        phone: '02-777-7777',
      },
    );
    expect(plan).toEqual({ address: null, addressDetail: null, phone: null, hasChanges: false });
  });

  it('기존 값이 공백이면 값 부재로 보고 채운다', () => {
    const plan = planKpaOrganizationContactSync(
      { address: 'CANON', metadata: { pharmacy_phone: '02-000-0001' } },
      { address: '  ', address_detail: { baseAddress: '' }, phone: '' },
    );
    expect(plan.address).toBe('CANON');
    expect(plan.addressDetail).toEqual({ baseAddress: 'CANON' });
    expect(plan.phone).toBe('02-000-0001');
  });

  it('키 단위 보완 — 기존 baseAddress 는 지키고 비어 있는 zipCode 만 채운다', () => {
    const plan = planKpaOrganizationContactSync(
      { address: 'CANON', zipCode: '11111' },
      { address: 'OPERATOR-EDITED', address_detail: { baseAddress: 'OP-BASE' }, phone: '02-777-7777' },
    );
    expect(plan.address).toBeNull();
    expect(plan.addressDetail).toEqual({ zipCode: '11111' });
    expect(plan.phone).toBeNull();
    expect(plan.hasChanges).toBe(true);
  });

  it('약국 전화만 비어 있으면 전화만 채운다', () => {
    const plan = planKpaOrganizationContactSync(
      { address: 'CANON', pharmacyPhone: '02-000-0002' },
      { address: 'OP', address_detail: { zipCode: '3', baseAddress: 'B', detailAddress: 'D' }, phone: null },
    );
    expect(plan.address).toBeNull();
    expect(plan.addressDetail).toBeNull();
    expect(plan.phone).toBe('02-000-0002');
  });

  it('원본 businessInfo 와 기존 row 를 변경하지 않는다 (read-only)', () => {
    const biz = { address: 'CANON', zipCode: '11111' };
    const existing = { address: null, address_detail: { baseAddress: 'OP' }, phone: null };
    const bizSnapshot = JSON.stringify(biz);
    const existingSnapshot = JSON.stringify(existing);
    planKpaOrganizationContactSync(biz, existing);
    expect(JSON.stringify(biz)).toBe(bizSnapshot);
    expect(JSON.stringify(existing)).toBe(existingSnapshot);
  });
});
