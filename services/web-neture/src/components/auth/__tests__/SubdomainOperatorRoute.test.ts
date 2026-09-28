/**
 * 서브도메인 전체 운영자 화면 경계 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 테스트가 존재하는 이유
 *
 * 예정된 실브라우저 시험 계정(`renagang21@gmail.com`)은 Neture 역할도 갖는다. 그래서
 * **화면에 들어가지는 것만으로는 이 경계가 맞는지 알 수 없다** — Neture 역할로 통과해 버린다.
 * 서브도메인 역할만 가진 계정을 운영 DB 에 만들지 않고 여기서 먼저 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { hasSubdomainOperatorScope } from '../SubdomainOperatorRoute';

type U = { roles?: string[]; memberships?: { serviceKey: string; status: string }[] } | null;

const user = (roles: string[], memberships: Array<[string, string]>): U => ({
  roles,
  memberships: memberships.map(([serviceKey, status]) => ({ serviceKey, status })),
});

describe('그 서비스 범위를 갖춘 계정만 통과한다', () => {
  it.each(['supplier', 'funding', 'community'] as const)('%s:admin + 같은 membership → 통과', (key) => {
    expect(hasSubdomainOperatorScope(user([`${key}:admin`], [[key, 'active']]), key)).toBe(true);
  });

  it.each(['supplier', 'funding'] as const)('%s:operator 도 통과한다', (key) => {
    expect(hasSubdomainOperatorScope(user([`${key}:operator`], [[key, 'active']]), key)).toBe(true);
  });

  it('Neture 역할이 **전혀 없어도** 통과한다 (이것이 고치려던 결함이다)', () => {
    const supplierOnly = user(['supplier:admin'], [['supplier', 'active']]);
    expect(hasSubdomainOperatorScope(supplierOnly, 'supplier')).toBe(true);
  });
});

describe('역할과 membership 을 **함께** 본다', () => {
  it('역할만 있고 membership 이 없으면 막는다', () => {
    expect(hasSubdomainOperatorScope(user(['supplier:admin'], []), 'supplier')).toBe(false);
  });

  it.each(['pending', 'suspended', 'rejected', 'withdrawn'])(
    'membership 이 %s 면 역할이 있어도 막는다 (백엔드 membership guard 와 같은 판정)',
    (status) => {
      expect(hasSubdomainOperatorScope(user(['supplier:admin'], [['supplier', status]]), 'supplier')).toBe(false);
    },
  );

  it('membership 만 있고 역할이 없으면 막는다 (일반 회원)', () => {
    expect(hasSubdomainOperatorScope(user([], [['supplier', 'active']]), 'supplier')).toBe(false);
  });
});

describe('다른 서비스 범위로는 들어갈 수 없다', () => {
  it('funding 운영자는 공급자 화면 범위를 못 갖춘다', () => {
    const funding = user(['funding:admin'], [['funding', 'active']]);
    expect(hasSubdomainOperatorScope(funding, 'supplier')).toBe(false);
    expect(hasSubdomainOperatorScope(funding, 'community')).toBe(false);
    expect(hasSubdomainOperatorScope(funding, 'funding')).toBe(true);
  });

  it('supplier 운영자는 펀딩·커뮤니티 화면 범위를 못 갖춘다', () => {
    const supplier = user(['supplier:admin'], [['supplier', 'active']]);
    expect(hasSubdomainOperatorScope(supplier, 'funding')).toBe(false);
    expect(hasSubdomainOperatorScope(supplier, 'community')).toBe(false);
  });

  it('역할 접두가 다른 서비스면 매칭되지 않는다 (문자열 포함이 아니라 정확 일치)', () => {
    // `neture:admin` 은 supplier 범위가 아니다 — 이 가드는 위임으로만 Neture 를 통과시킨다.
    expect(hasSubdomainOperatorScope(user(['neture:admin'], [['neture', 'active']]), 'supplier')).toBe(false);
  });
});

describe('개별 커뮤니티 운영자는 서비스 전체 화면과 무관하다', () => {
  /**
   * 개체 역할(`community_memberships.role='operator'`)은 `role_assignments` 에 없다.
   * 그래서 `community` 서비스 가입만 있는 사람은 여기서 매칭되지 않는다 — 서비스 전체 관리자와
   * 개별 커뮤니티 운영자를 섞지 않는다는 계약이 화면 쪽에서도 지켜진다.
   */
  it('community 가입 + 개체 운영자여도 서비스 전체 범위는 아니다', () => {
    expect(hasSubdomainOperatorScope(user([], [['community', 'active']]), 'community')).toBe(false);
  });

  it('community:operator 역할은 만들지 않았으므로 community:admin 만 통과한다', () => {
    expect(hasSubdomainOperatorScope(user(['community:admin'], [['community', 'active']]), 'community')).toBe(true);
  });
});

describe('빈 입력', () => {
  it.each([null, undefined])('user 가 %s 면 막는다', (u) => {
    expect(hasSubdomainOperatorScope(u as U, 'supplier')).toBe(false);
  });
});
