/**
 * 서브도메인 경계 판정 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-8
 */
import { describe, it, expect } from 'vitest';
import { decideHost, getHostProfile, isOwnedPath, readCutoverFlags } from '../hostProfile';

const loc = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('getHostProfile', () => {
  it('서브도메인 · 대표 · 기타', () => {
    expect(getHostProfile('supplier.neture.co.kr')).toBe('supplier');
    expect(getHostProfile('FUNDING.neture.co.kr')).toBe('funding');
    expect(getHostProfile('neture.co.kr')).toBe('main');
    expect(getHostProfile('www.neture.co.kr')).toBe('main');
    expect(getHostProfile('neture-web-xyz.a.run.app')).toBe('main');
    expect(getHostProfile('localhost')).toBe('main');
  });
});

describe('supplier 호스트', () => {
  it('/ 는 그대로 — App 이 공급자 대표 화면을 직접 렌더', () => {
    expect(decideHost('supplier', loc('/'))).toEqual({ kind: 'stay' });
  });
  it('공급자 경로 · 레거시 deep-link 는 그대로', () => {
    expect(decideHost('supplier', loc('/supplier/dashboard')).kind).toBe('stay');
    expect(decideHost('supplier', loc('/supplier/forum/posts')).kind).toBe('stay');
    expect(decideHost('supplier', loc('/account/supplier/products')).kind).toBe('stay');
    expect(decideHost('supplier', loc('/workspace/hub')).kind).toBe('stay');
  });
  it('인증 · 약관 · 내 정보는 그 호스트 세션으로 그대로', () => {
    for (const p of ['/handoff', '/login', '/register', '/terms', '/privacy', '/contact', '/mypage/business-profile']) {
      expect(decideHost('supplier', loc(p)).kind).toBe('stay');
    }
  });
  it('소유하지 않은 경로는 대표 호스트 같은 경로로(쿼리 · 해시 보존)', () => {
    expect(decideHost('supplier', loc('/operator/suppliers', '?page=2', '#top'))).toEqual({
      kind: 'external',
      href: 'https://neture.co.kr/operator/suppliers?page=2#top',
    });
    expect(decideHost('supplier', loc('/market-trial/1'))).toEqual({
      kind: 'external',
      href: 'https://neture.co.kr/market-trial/1',
    });
  });
  it('접두만 같은 경로는 소유로 보지 않는다', () => {
    expect(isOwnedPath('supplier', '/suppliers')).toBe(false);
    expect(decideHost('supplier', loc('/suppliers')).kind).toBe('external');
  });
});

describe('funding 호스트', () => {
  it('/ 는 그대로 — App 이 펀딩 대표 화면을 직접 렌더', () => {
    expect(decideHost('funding', loc('/', '?ref=a'))).toEqual({ kind: 'stay' });
  });
  it('펀딩 경로는 그대로 · 공급자 경로는 대표 호스트로', () => {
    expect(decideHost('funding', loc('/market-trial/my')).kind).toBe('stay');
    expect(decideHost('funding', loc('/supplier/market-trial/3'))).toEqual({
      kind: 'external',
      href: 'https://neture.co.kr/supplier/market-trial/3',
    });
  });
});

describe('community 호스트', () => {
  it('호스트 판정', () => {
    expect(getHostProfile('community.neture.co.kr')).toBe('community');
  });
  it('/ 는 그대로(커뮤니티 진입 화면)', () => {
    expect(decideHost('community', loc('/')).kind).toBe('stay');
  });
  it('/pharmacist · /retail → 현재 동작하는 각 서비스 포럼', () => {
    expect(decideHost('community', loc('/pharmacist'))).toEqual({ kind: 'external', href: 'https://pharmacy.neture.co.kr/forum' });
    expect(decideHost('community', loc('/retail/abc'))).toEqual({ kind: 'external', href: 'https://retail.neture.co.kr/forum' });
  });
  it('그 밖의 경로는 대표 호스트로 · 로그인은 그 호스트', () => {
    expect(decideHost('community', loc('/forum'))).toEqual({ kind: 'external', href: 'https://neture.co.kr/forum' });
    expect(decideHost('community', loc('/login')).kind).toBe('stay');
  });
});

describe('대표 호스트 cutover', () => {
  it('기본(플래그 꺼짐) — 기존 링크 그대로', () => {
    expect(decideHost('main', loc('/supplier/dashboard')).kind).toBe('stay');
    expect(decideHost('main', loc('/market-trial/1')).kind).toBe('stay');
    expect(decideHost('main', loc('/')).kind).toBe('stay');
  });
  it('플래그가 켜진 호스트만 새 호스트로(경로 · 쿼리 보존)', () => {
    const cutover = { supplier: true };
    expect(decideHost('main', loc('/supplier/orders', '?s=1'), cutover)).toEqual({
      kind: 'external',
      href: 'https://supplier.neture.co.kr/supplier/orders?s=1',
    });
    expect(decideHost('main', loc('/market-trial/1'), cutover).kind).toBe('stay');
  });
  it('readCutoverFlags — "true" 문자열만 켠다', () => {
    expect(readCutoverFlags({ VITE_HOST_CUTOVER_SUPPLIER: 'true' })).toEqual({ supplier: true, funding: false });
    expect(readCutoverFlags({ VITE_HOST_CUTOVER_FUNDING: '1' })).toEqual({ supplier: false, funding: false });
  });
});
