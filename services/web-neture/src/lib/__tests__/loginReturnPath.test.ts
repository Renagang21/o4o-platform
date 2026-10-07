/**
 * 로그인 후 복귀 경로 — CHECK-O4O-URL-FIRST-CENSUS-V1 §19-7
 * 펀딩 화면의 `?redirect=` 가 무시되던 결함 + 외부 이동 차단.
 */
import { describe, it, expect } from 'vitest';
import { isSafeReturnPath, resolveLoginReturnPath } from '../loginReturnPath';

describe('resolveLoginReturnPath', () => {
  it('?returnUrl= 과 레거시 ?redirect= 모두 복귀 경로로 쓴다', () => {
    expect(resolveLoginReturnPath(undefined, '?returnUrl=/market-trial/1')).toBe('/market-trial/1');
    expect(resolveLoginReturnPath(undefined, '?redirect=/market-trial/my')).toBe('/market-trial/my');
  });

  it('state.from 이 쿼리보다 우선한다', () => {
    expect(resolveLoginReturnPath({ from: '/mypage' }, '?returnUrl=/market-trial')).toBe('/mypage');
  });

  it('외부로 나가는 값은 버린다', () => {
    expect(resolveLoginReturnPath(undefined, '?returnUrl=//evil.example')).toBeUndefined();
    expect(resolveLoginReturnPath(undefined, '?redirect=https://evil.example')).toBeUndefined();
    expect(resolveLoginReturnPath(undefined, '?returnUrl=/\\evil.example')).toBeUndefined();
  });

  it('값이 없으면 undefined', () => {
    expect(resolveLoginReturnPath(undefined, '')).toBeUndefined();
    expect(resolveLoginReturnPath(null, '?returnUrl=')).toBeUndefined();
  });

  it('isSafeReturnPath', () => {
    expect(isSafeReturnPath('/supplier/dashboard')).toBe(true);
    expect(isSafeReturnPath('supplier')).toBe(false);
    expect(isSafeReturnPath(42)).toBe(false);
  });
});
