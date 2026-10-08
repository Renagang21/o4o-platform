/**
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 — 상태 전이 · 수취 주체 묶음 · 입력 규칙 · 결제 모드 (DB 없음, CI 실행)
 * 실제 SQL · 권한 판정은 neture-pharmacy-commerce.integration.spec.ts(격리 PostgreSQL)가 검증한다.
 */
import {
  canReapply,
  isReceiverDetermined,
  isValidOrderQuantity,
  nextMembershipStatus,
  receiverKeyOf,
  rowsOf,
} from '../constants.js';
import { groupCheckoutLines, type CheckoutLine } from '../services/pharmacy-cart.service.js';
import { nextProposalStatus } from '../services/supply-proposal.service.js';
import { nextEventStatus, validateEventInput } from '../services/semi-franchise-event.service.js';
import { normalizeBusinessNumber, validateApplication } from '../services/pharmacy-membership.service.js';
import { resolvePaymentMode } from '../services/pharmacy-payment.service.js';

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('가입 상태 전이 (내 매장(약국) 신청 · 세미프랜차이즈 공용)', () => {
  it.each([
    ['pending', 'approve', 'active'],
    ['pending', 'reject', 'rejected'],
    ['active', 'suspend', 'suspended'],
    ['suspended', 'reactivate', 'active'],
    ['active', 'terminate', 'terminated'],
    ['suspended', 'terminate', 'terminated'],
  ] as const)('%s --%s--> %s', (from, action, to) => {
    expect(nextMembershipStatus(from, action)).toBe(to);
  });

  it.each([
    ['active', 'approve'],
    ['rejected', 'approve'],
    ['terminated', 'reactivate'],
    ['pending', 'suspend'],
  ] as const)('%s 에서 %s 는 허용하지 않는다', (from, action) => {
    expect(nextMembershipStatus(from, action)).toBeNull();
  });

  it('재신청은 반려 · 종료 상태에서만', () => {
    expect(canReapply('rejected')).toBe(true);
    expect(canReapply('terminated')).toBe(true);
    expect(canReapply('pending')).toBe(false);
    expect(canReapply('active')).toBe(false);
    expect(canReapply('suspended')).toBe(false);
  });
});

describe('공급 제안 · 이벤트 전이 — 가격 수정 전이 없음, 종료는 단방향', () => {
  it('제안', () => {
    expect(nextProposalStatus('pending', 'approve')).toBe('approved');
    expect(nextProposalStatus('approved', 'end')).toBe('ended');
    expect(nextProposalStatus('ended', 'approve')).toBeNull();
    expect(nextProposalStatus('rejected', 'approve')).toBeNull();
  });
  it('이벤트', () => {
    expect(nextEventStatus('pending', 'approve')).toEqual({ status: 'approved', active: true });
    expect(nextEventStatus('approved', 'cancel')).toEqual({ status: 'canceled', active: false });
    expect(nextEventStatus('canceled', 'approve')).toBeNull();
  });
});

describe('수취 주체 — 미확정은 세미프랜차이즈별로 따로 묶는다(D1)', () => {
  const line = (sf: string, receiver: string | null, supplier: string): CheckoutLine =>
    ({ cartItemId: `${sf}-${supplier}`, quantity: 1, option: { semiFranchiseKey: sf, paymentReceiverKey: receiver, supplierId: supplier } } as any);

  it('미확정 수취 주체는 세미프랜차이즈마다 다른 키', () => {
    expect(receiverKeyOf('pharmacy', null)).toBe('undetermined:pharmacy');
    expect(receiverKeyOf('x', '  ')).toBe('undetermined:x');
    expect(isReceiverDetermined(receiverKeyOf('x', null))).toBe(false);
    expect(receiverKeyOf('x', 'R1')).toBe('R1');
  });

  it('(수취 주체, 공급자) 단위로 나누고, 같은 수취 주체 · 같은 공급자만 합친다', () => {
    const groups = groupCheckoutLines([
      line('pharmacy', null, 'S1'),
      line('x', null, 'S1'),
      line('pharmacy', null, 'S1'),
      line('y', 'R1', 'S2'),
      line('z', 'R1', 'S2'),
    ]);
    expect(groups.map((g) => [g.receiverKey, g.supplierId, g.lines.length])).toEqual([
      ['undetermined:pharmacy', 'S1', 2],
      ['undetermined:x', 'S1', 1],
      ['R1', 'S2', 2],
    ]);
  });
});

describe('입력 규칙', () => {
  it('수량은 기존 B2B 검사(1..1000) 그대로 — 새 상한 없음(D2)', () => {
    expect(isValidOrderQuantity(1)).toBe(true);
    expect(isValidOrderQuantity(1000)).toBe(true);
    expect(isValidOrderQuantity(1001)).toBe(false);
    expect(isValidOrderQuantity(0)).toBe(false);
    expect(isValidOrderQuantity(1.5)).toBe(false);
  });

  it('사업자번호는 숫자 10자리로 정규화, 면허번호 · 약국명 필수', () => {
    expect(normalizeBusinessNumber('123-45-67890')).toBe('1234567890');
    expect(normalizeBusinessNumber('12345')).toBeNull();
    expect(() => validateApplication({ pharmacyName: 'a', businessNumber: '1234567890' })).toThrow(/면허번호/);
    expect(validateApplication({ pharmacyName: ' 약국 ', businessNumber: '123-45-67890', pharmacistLicenseNumber: 'L1' }))
      .toMatchObject({ pharmacyName: '약국', businessNumber: '1234567890' });
  });

  it('이벤트 가격은 공급가 이하, 기간 필수, 수량 하한', () => {
    const base = { startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-02T00:00:00Z' };
    expect(() => validateEventInput({ ...base, eventPrice: 11000 }, 10000)).toThrow(/공급가/);
    expect(() => validateEventInput({ eventPrice: 9000 }, 10000)).toThrow(/일시/);
    expect(() => validateEventInput({ ...base, eventPrice: 9000, perStoreLimit: 0 }, 10000)).toThrow(/perStoreLimit/);
    expect(validateEventInput({ ...base, eventPrice: 9000, totalQuantity: 0 }, 10000)).toMatchObject({ eventPrice: 9000, totalQuantity: 0 });
  });
});

describe('결제 모드 — 키 부재를 실결제 성공으로 처리하지 않는다', () => {
  it('명시값 우선', () => {
    expect(resolvePaymentMode({ NETURE_PHARMACY_PAYMENT_MODE: 'live', NODE_ENV: 'production' })).toBe('live');
    expect(resolvePaymentMode({ NETURE_PHARMACY_PAYMENT_MODE: 'TEST', NODE_ENV: 'production' })).toBe('test');
  });
  it('미설정: production 은 결제 불가, 그 밖은 test', () => {
    expect(resolvePaymentMode({ NODE_ENV: 'production' })).toBe('disabled');
    expect(resolvePaymentMode({ NODE_ENV: 'development' })).toBe('test');
    expect(resolvePaymentMode({ NETURE_PHARMACY_PAYMENT_MODE: 'bogus', NODE_ENV: 'production' })).toBe('disabled');
  });
});

describe('rowsOf — TypeORM UPDATE 결과 정규화', () => {
  it('[rows, count] 와 rows 를 같은 rows 로', () => {
    expect(rowsOf([[{ id: 1 }], 1])).toEqual([{ id: 1 }]);
    expect(rowsOf([[], 0])).toEqual([]);
    expect(rowsOf([{ id: 2 }])).toEqual([{ id: 2 }]);
    expect(rowsOf(undefined)).toEqual([]);
  });
});
