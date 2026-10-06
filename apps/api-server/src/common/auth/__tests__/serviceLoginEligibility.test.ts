/**
 * WO-O4O-SERVICE-NOT-MEMBER-AUTH-CONTRACT-RESTORATION-V1 — 서비스 로그인 자격 판정
 *
 *  G1 게이트는 catalog `loginMembershipRequired` 서비스의 호스트(canonical · legacy)에서만 켜진다
 *  G2 대표 진입 · Store Workspace · 관리자 · 자기 호스트 가입 서비스 · 공유 호스트는 게이트 없음
 *  G3 해당 서비스 row 는 상태 불문 통과 · 다른 서비스 row 는 불인정 · super_admin 통과
 */
import {
  resolveLoginMembershipGateKey,
  isServiceLoginAllowed,
} from '../service-login-eligibility.policy.js';
import { O4O_SERVICES } from '../../../config/service-catalog.js';

describe('resolveLoginMembershipGateKey', () => {
  it.each([
    ['https://pharmacy.neture.co.kr', 'kpa-society'],
    ['https://retail.neture.co.kr', 'k-cosmetics'],
    ['https://k-cosmetics.site', 'k-cosmetics'],
  ])('G1 %s → %s', (origin, key) => {
    expect(resolveLoginMembershipGateKey(origin)).toBe(key);
  });

  it.each([
    'https://neture.co.kr', // 대표 진입 — 신규 사용자 · 약국 가입 신청이 로그인 뒤에 시작된다
    'https://store.neture.co.kr', // Store Workspace — 매장 가입 신청 자리
    'https://admin.neture.co.kr', // 관리자 — Google 전용 · platform 역할 축
    'https://pharmacyhub.co.kr', // 자기 호스트 /join (requireAuth)
    'https://kpa-society.co.kr', // kpa-society legacy 이자 kpa-branch(/kpa) 호스트 — 단정 불가
    'https://study.neture.co.kr', // lecture — 이 WO 범위 밖
    'https://community.neture.co.kr',
    'https://supplier.neture.co.kr',
    'https://funding.neture.co.kr',
    'https://unknown.example.com',
    'not a url',
    undefined,
    null,
  ])('G2 %s → 게이트 없음', (origin) => {
    expect(resolveLoginMembershipGateKey(origin as string | undefined | null)).toBeNull();
  });

  it('게이트 서비스는 catalog 선언과 일치한다 (kpa-society · k-cosmetics 뿐)', () => {
    expect(O4O_SERVICES.filter((s) => s.loginMembershipRequired).map((s) => s.key).sort()).toEqual([
      'k-cosmetics',
      'kpa-society',
    ]);
  });
});

describe('isServiceLoginAllowed', () => {
  it('게이트 키가 없으면 항상 허용', () => {
    expect(isServiceLoginAllowed(null, [], [])).toBe(true);
    expect(isServiceLoginAllowed(undefined, undefined, undefined)).toBe(true);
  });

  it.each(['active', 'pending', 'rejected', 'suspended', 'withdrawn'])('G3 해당 서비스 row(status=%s) → 허용', (status) => {
    expect(isServiceLoginAllowed('kpa-society', [], [{ serviceKey: 'kpa-society', status } as never])).toBe(true);
  });

  it('G3 다른 서비스 row 만 있으면 거절 (kpa-society 자격을 다른 서비스 자격으로 재해석하지 않는다)', () => {
    expect(isServiceLoginAllowed('k-cosmetics', [], [{ serviceKey: 'kpa-society' }, { serviceKey: 'neture' }])).toBe(false);
    expect(isServiceLoginAllowed('kpa-society', [], [])).toBe(false);
  });

  it('G3 super_admin · platform:super_admin 은 허용, 그 밖의 역할은 membership 을 대신하지 못한다', () => {
    expect(isServiceLoginAllowed('kpa-society', ['platform:super_admin'], [])).toBe(true);
    expect(isServiceLoginAllowed('kpa-society', ['super_admin'], [])).toBe(true);
    expect(isServiceLoginAllowed('kpa-society', ['kpa:store_owner', 'platform:operator'], [])).toBe(false);
  });
});
