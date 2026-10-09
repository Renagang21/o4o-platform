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
    expect(decideHost('supplier', loc('/supplier/forum/posts'))).toEqual({ kind: 'external', href: 'https://community.neture.co.kr/communities/o4o-general/forum/posts' });
    expect(decideHost('supplier', loc('/account/supplier/products')).kind).toBe('stay');
    expect(decideHost('supplier', loc('/workspace/hub')).kind).toBe('stay');
  });
  it('인증 · 약관 · 내 정보는 그 호스트 세션으로 그대로', () => {
    for (const p of ['/handoff', '/login', '/register', '/terms', '/privacy', '/contact', '/mypage/business-profile']) {
      expect(decideHost('supplier', loc(p)).kind).toBe('stay');
    }
  });
  it('소유하지 않은 경로는 대표 호스트 같은 경로로(쿼리 · 해시 보존)', () => {
    expect(decideHost('supplier', loc('/operator/suppliers', '?page=2', '#top'))).toEqual({ kind: 'stay' });
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
  it('독립 약사 커뮤니티 진입과 가입·운영은 커뮤니티 호스트 소유', () => {
    for (const p of ['/pharmacist', '/communities/pharmacy/forum/posts', '/mypage/communities', '/admin/communities', '/operator/communities']) {
      expect(decideHost('community', loc(p))).toEqual({ kind: 'stay' });
    }
  });
  it('/retail 은 종료된 retail.neture.co.kr 로 보내지 않는다(K-Cosmetics 공개 서비스 종료)', () => {
    expect(decideHost('community', loc('/retail/abc'))).toEqual({ kind: 'external', href: 'https://neture.co.kr/retail/abc' });
  });
  it('그 밖의 경로는 대표 호스트로 · 로그인은 그 호스트', () => {
    expect(decideHost('community', loc('/forum'))).toEqual({ kind: 'external', href: 'https://community.neture.co.kr/communities/o4o-general/forum' });
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
    expect(readCutoverFlags({ VITE_HOST_CUTOVER_SUPPLIER: 'true' })).toEqual({ supplier: true, funding: true });
    expect(readCutoverFlags({ VITE_HOST_CUTOVER_FUNDING: '1' })).toEqual({ supplier: true, funding: false });
  });
});


describe('운영 기능의 소유 호스트', () => {
  it('공개 전환 플래그와 무관하게 서비스별 관리 기능을 해당 서비스로 연결한다', () => {
    for (const [path, origin] of [
      ['/operator/suppliers', 'supplier'], ['/admin/supplier-governance', 'supplier'],
      ['/operator/market-trial/requests', 'funding'], ['/admin/market-trial', 'funding'],
      ['/admin/communities', 'community'], ['/operator/communities', 'community'], ['/mypage/communities', 'community'],
    ]) {
      expect(decideHost('main', loc(path, '?page=2', '#review'))).toEqual({
        kind: 'external', href: `https://${origin}.neture.co.kr${path}?page=2#review`,
      });
    }
  });
  it('약국 심사·사업 운영·전체 관리의 실제 목적지를 구분한다', () => {
    for (const [path, host] of [
      ['/operator/pharmacy-memberships', 'store'], ['/operator/semi-franchises/pharmacy/contents/new', 'pharmacy'],
      ['/admin/semi-franchises', 'admin'], ['/admin/platform/roles', 'admin'],
      ['/admin/settings/service-audience', 'admin'],
    ]) {
      expect(decideHost('main', loc(path))).toEqual({ kind: 'external', href: `https://${host}.neture.co.kr${path}` });
    }
    expect(decideHost('main', loc('/admin/contents'))).toEqual({ kind: 'stay' });
    expect(decideHost('main', loc('/operator/semi-franchises-other'))).toEqual({ kind: 'stay' });
  });
  it('독립/사업 커뮤니티의 직접 주소는 메인에서도 커뮤니티로 연결한다', () => {
    expect(decideHost('main', loc('/communities/business-alpha/forum'))).toEqual({ kind: 'external', href: 'https://community.neture.co.kr/communities/business-alpha/forum' });
  });
});


describe('이전 커뮤니티 주소', () => {
  it('공급자·workspace 포럼의 목적지와 쿼리/복귀 위치를 보존한다', () => {
    for (const [source, target] of [
      ['/supplier/forum/post/one', '/post/one'], ['/supplier/my-forum', '/owned'],
      ['/supplier/forum/request-category', '/request'], ['/workspace/forum/write', '/write'],
    ]) {
      expect(decideHost('supplier', loc(source, '?edit=one', '#form'))).toEqual({
        kind: 'external', href: `https://community.neture.co.kr/communities/o4o-general/forum${target}?edit=one#form`,
      });
    }
  });
  it('게시판별 공지와 글 작성 링크를 실제 포럼 경로로 변환한다', () => {
    expect(decideHost('main', loc('/forum/service-update', '?page=2'))).toEqual({ kind: 'external', href: 'https://community.neture.co.kr/communities/o4o-general/forum/posts?page=2&board=service-update' });
    expect(decideHost('main', loc('/forum/service-update/new'))).toEqual({ kind: 'external', href: 'https://community.neture.co.kr/communities/o4o-general/forum/write?forum=service-update' });
    expect(decideHost('main', loc('/forum/service-update/notice'))).toEqual({ kind: 'external', href: 'https://community.neture.co.kr/communities/o4o-general/forum/post/notice' });
  });
});


it.each(['supplier', 'funding', 'community'] as const)('%s member list/detail remain on their own service host', profile => {
  for (const tail of ['', '/fixture-user']) {
    const pathname = `/operator/service-members/${profile}${tail}`;
    expect(decideHost(profile, { pathname, search: '', hash: '' })).toEqual({ kind: 'stay' });
    expect(decideHost('main', { pathname, search: '?page=2', hash: '' })).toEqual({ kind: 'external', href: `https://${profile}.neture.co.kr${pathname}?page=2` });
  }
});
