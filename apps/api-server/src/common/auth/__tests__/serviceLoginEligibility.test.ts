/**
 * WO-O4O-SERVICE-NOT-MEMBER-AUTH-CONTRACT-RESTORATION-V1 — 서비스 로그인 자격 판정
 *
 *  G1 게이트는 catalog `loginMembershipRequired` 서비스의 호스트(canonical · legacy)에서만 켜진다
 *  G2 대표 진입 · Store Workspace · 관리자 · 자기 호스트 가입 서비스 · 공유 호스트는 게이트 없음
 *  G3 해당 서비스 row 는 상태 불문 통과 · 다른 서비스 row 는 불인정 · super_admin 통과
 *  G4 (WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1) kpa-society 게이트만 세미프랜차이즈 'pharmacy' 자격을 대안으로 본다 —
 *     Neture 기본 active ∧ 세미프랜차이즈 active 만 통과 · 미충족은 상태별 next · 기존 row 가 있으면 조회 0
 */
import {
  resolveLoginMembershipGateKey,
  isServiceLoginAllowed,
  semiFranchiseAccessKeyFor,
  evaluateServiceLoginAccess,
  serviceNotMemberMessage,
  SERVICE_NOT_MEMBER_MESSAGE,
} from '../service-login-eligibility.policy.js';
import {
  decideSemiFranchiseAccess,
  nextForStatuses,
  SEMI_FRANCHISE_ACCESS_MESSAGES,
} from '../../../modules/neture-pharmacy/services/semi-franchise-service-access.js';
import { O4O_SERVICES } from '../../../config/service-catalog.js';

describe('resolveLoginMembershipGateKey', () => {
  it.each([
    ['https://pharmacy.neture.co.kr', 'kpa-society'],
    ['https://retail.neture.co.kr', 'k-cosmetics'],
    ['https://k-cosmetics.site', 'k-cosmetics'],
    ['https://www.k-cosmetics.site', 'k-cosmetics'], // www 별칭도 같은 게이트
    ['https://www.pharmacy.neture.co.kr', 'kpa-society'],
    // WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1: kpa-branch 가 kpa.neture.co.kr 로 옮겨
    //   kpa-society.co.kr 은 kpa-society 의 legacy 호스트로만 남는다(종전: kpa-branch `/kpa` 와 겹쳐 단정 불가).
    ['https://kpa-society.co.kr', 'kpa-society'],
    ['https://www.kpa-society.co.kr', 'kpa-society'],
  ])('G1 %s → %s', (origin, key) => {
    expect(resolveLoginMembershipGateKey(origin)).toBe(key);
  });

  it.each([
    'https://neture.co.kr', // 대표 진입 — 신규 사용자 · 약국 가입 신청이 로그인 뒤에 시작된다
    'https://store.neture.co.kr', // Store Workspace — 매장 가입 신청 자리
    'https://admin.neture.co.kr', // 관리자 — Google 전용 · platform 역할 축
    'https://pharmacyhub.co.kr', // 자기 호스트 /join (requireAuth)
    'https://kpa.neture.co.kr', // kpa-branch — 자기 호스트 /join(분회 운영자 승인) · 게이트 없음
    'https://www.neture.co.kr',
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

describe('G4 세미프랜차이즈 자격', () => {
  it('semiFranchiseAccessKey 는 kpa-society 하나뿐 (pharmacy) · 그 밖의 서비스는 null', () => {
    expect(O4O_SERVICES.filter((s) => s.semiFranchiseAccessKey).map((s) => [s.key, s.semiFranchiseAccessKey])).toEqual([
      ['kpa-society', 'pharmacy'],
    ]);
    expect(semiFranchiseAccessKeyFor('kpa-society')).toBe('pharmacy');
    for (const k of ['k-cosmetics', 'neture', 'pharmacy-hub', 'kpa-branch', 'unknown', null, undefined]) {
      expect(semiFranchiseAccessKeyFor(k)).toBeNull();
    }
  });

  it.each([
    [null, null, 'apply_pharmacy'],
    ['rejected', null, 'apply_pharmacy'],
    ['terminated', 'active', 'apply_pharmacy'], // 내 매장(약국) 신청이 끝났으면 세미프랜차이즈 active 도 불인정
    ['pending', null, 'pharmacy_pending'],
    ['suspended', 'active', 'pharmacy_suspended'],
    ['active', null, 'apply_semi_franchise'],
    ['active', 'rejected', 'apply_semi_franchise'],
    ['active', 'terminated', 'apply_semi_franchise'],
    ['active', 'pending', 'semi_franchise_pending'],
    ['active', 'suspended', 'semi_franchise_suspended'],
    ['active', 'active', null],
  ])('nextForStatuses(%s, %s) → %s', (basic, semi, next) => {
    expect(nextForStatuses(basic, semi)).toBe(next);
  });

  it('여러 약국 조직 중 하나라도 둘 다 active 이면 허용 · 아니면 가장 진행된 조직 기준 안내', () => {
    expect(decideSemiFranchiseAccess('pharmacy', [{ basic: 'pending', semi: null }, { basic: 'active', semi: 'active' }]).allowed).toBe(true);
    // 기본 active 조직과 세미프랜차이즈 active(기본 미active) 조직이 따로 있으면 불허 — 같은 조직에서 함께 만족해야 한다
    const split = decideSemiFranchiseAccess('pharmacy', [{ basic: 'active', semi: null }, { basic: 'suspended', semi: 'active' }]);
    expect(split).toMatchObject({ allowed: false, pharmacyMembershipStatus: 'active', next: 'apply_semi_franchise' });
    expect(decideSemiFranchiseAccess('pharmacy', [{ basic: 'active', semi: 'suspended' }, { basic: 'active', semi: 'pending' }]))
      .toMatchObject({ allowed: false, semiFranchiseMembershipStatus: 'pending', next: 'semi_franchise_pending' });
  });

  it('evaluateServiceLoginAccess — 기존 row · super_admin · 게이트 없음은 resolver 를 부르지 않는다', async () => {
    const resolver = jest.fn();
    await expect(evaluateServiceLoginAccess(resolver, 'u', 'kpa-society', [], [{ serviceKey: 'kpa-society' }])).resolves.toEqual({ allowed: true });
    await expect(evaluateServiceLoginAccess(resolver, 'u', 'kpa-society', ['super_admin'], [])).resolves.toEqual({ allowed: true });
    await expect(evaluateServiceLoginAccess(resolver, 'u', null, [], [])).resolves.toEqual({ allowed: true });
    await expect(evaluateServiceLoginAccess(resolver, 'u', 'k-cosmetics', [], [])).resolves.toEqual({ allowed: false });
    expect(resolver).not.toHaveBeenCalled();
  });

  it('evaluateServiceLoginAccess — kpa-society 미가입이면 세미프랜차이즈 자격으로 판정 · 거절은 allowed 없는 details', async () => {
    const ok = jest.fn(async (_u: string, key: string) => decideSemiFranchiseAccess(key, [{ basic: 'active', semi: 'active' }]));
    await expect(evaluateServiceLoginAccess(ok, 'u', 'kpa-society', [], [{ serviceKey: 'neture' }])).resolves.toEqual({ allowed: true });
    expect(ok).toHaveBeenCalledWith('u', 'pharmacy');

    const ng = jest.fn(async (_u: string, key: string) => decideSemiFranchiseAccess(key, [{ basic: 'pending', semi: null }]));
    const res = await evaluateServiceLoginAccess(ng, 'u', 'kpa-society', [], []);
    expect(res).toEqual({
      allowed: false,
      serviceAccess: { semiFranchiseKey: 'pharmacy', pharmacyMembershipStatus: 'pending', semiFranchiseMembershipStatus: null, next: 'pharmacy_pending' },
    });
    expect(serviceNotMemberMessage(res.serviceAccess)).toBe(SEMI_FRANCHISE_ACCESS_MESSAGES.pharmacy_pending);
    expect(serviceNotMemberMessage(undefined)).toBe(SERVICE_NOT_MEMBER_MESSAGE);
  });
});
