/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정
 *
 * 서브도메인 운영자 화면(공급자 상태 관리 · 공급자 승인 콘솔 · 유통참여형 펀딩)의 화면 guard 가
 * 백엔드와 같은 판정을 쓰는지 고정한다.
 *   - supplier:admin + supplier membership 만 가진 계정 → 공급자 상태 관리 · 승인 콘솔 O · 펀딩 X · Neture 관리자 화면 X
 *   - supplier:operator + supplier membership 만 → 승인 콘솔 O · 상태 관리 X (admin 전용 유지)
 *   - funding:admin + funding membership 만 가진 계정 → 펀딩 O · 공급자 상태 관리 X · Neture 운영자 화면 X
 *   - Neture 관리자/운영자 역할만 가진 계정 → 두 화면 X (백엔드가 403 을 주는 화면에 들어오지 않는다)
 *   - 역할은 있으나 그 서비스 membership 이 없으면 → membership 안내(화면 X)
 *   - platform:super_admin → 통과 (백엔드 platformBypass 와 같음)
 * 운영 DB · 네트워크 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';

type U = { id: string; email: string; name: string; roles: string[]; memberships: { serviceKey: string; status: string }[] };
const authState: { user: U | null } = { user: null };
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, isAuthenticated: !!authState.user, isLoading: false }),
}));

import { SubdomainOperatorRoute, AdminRoute, OperatorRoute } from '../RoleGuard';
import {
  subdomainOperatorRoles,
  canSeeSubdomainOperatorPath,
  withoutUnreachableSubdomainOperatorItems,
} from '../../../lib/role-constants';

const user = (roles: string[], memberships: Array<[string, string]> = []): U => ({
  id: 'u1',
  email: 'u1@example.test',
  name: '운영자',
  roles,
  memberships: memberships.map(([serviceKey, status]) => ({ serviceKey, status })),
});

// App.tsx 와 같은 모양의 축소 라우터 — 실제 guard 컴포넌트를 쓴다.
function mount(at: string) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login" />} />
        <Route element={<SubdomainOperatorRoute serviceKey="supplier" level="admin"><Outlet /></SubdomainOperatorRoute>}>
          <Route path="/admin/supplier-governance" element={<div data-testid="supplier-governance" />} />
        </Route>
        <Route element={<SubdomainOperatorRoute serviceKey="supplier" level="operator"><Outlet /></SubdomainOperatorRoute>}>
          <Route path="/operator/suppliers" element={<div data-testid="supplier-approvals" />} />
        </Route>
        <Route element={<SubdomainOperatorRoute serviceKey="funding" level="operator"><Outlet /></SubdomainOperatorRoute>}>
          <Route path="/operator/market-trial" element={<div data-testid="funding" />} />
        </Route>
        <Route element={<SubdomainOperatorRoute serviceKey="community" level="admin"><Outlet /></SubdomainOperatorRoute>}>
          <Route path="/admin/communities" element={<div data-testid="community-admin" />} />
        </Route>
        <Route element={<AdminRoute><Outlet /></AdminRoute>}>
          <Route path="/admin" element={<div data-testid="neture-admin" />} />
        </Route>
        <Route element={<OperatorRoute><Outlet /></OperatorRoute>}>
          <Route path="/operator" element={<div data-testid="neture-operator" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const sees = (at: string, id: string) => {
  mount(at);
  const found = screen.queryByTestId(id) !== null;
  cleanup();
  return found;
};

// 권한 매트릭스 — 계정(역할 · membership) × 화면 5곳. 행마다 **열리는 화면 목록 전체** 를 적는다
// (목록에 없는 화면은 막혀야 한다). 개별 expect 나열 대신 표 한 장으로 고정한다.
const SCREENS = {
  governance: ['/admin/supplier-governance', 'supplier-governance'],
  approvals: ['/operator/suppliers', 'supplier-approvals'],
  funding: ['/operator/market-trial', 'funding'],
  community: ['/admin/communities', 'community-admin'],
  netureAdmin: ['/admin', 'neture-admin'],
  netureOperator: ['/operator', 'neture-operator'],
} as const;
type Screen = keyof typeof SCREENS;

const MATRIX: Array<[string, string[], Array<[string, string]>, Screen[]]> = [
  ['supplier:admin + supplier → 상태 관리 + 승인 콘솔', ['supplier:admin'], [['supplier', 'active']], ['governance', 'approvals']],
  // 상태 관리만 옮겨 두면 supplier 운영자가 목록은 보고 승인은 못 한다 — 화면과 API 가 같은 축이어야 한다.
  ['supplier:operator + supplier → 승인 콘솔만 (상태 관리는 admin 전용)', ['supplier:operator'], [['supplier', 'active']], ['approvals']],
  ['funding:admin + funding → 펀딩만 (admin ⊃ operator · 공급자 교차 0)', ['funding:admin'], [['funding', 'active']], ['funding']],
  ['funding:operator + funding → 펀딩', ['funding:operator'], [['funding', 'active']], ['funding']],
  ['Neture 관리자·운영자만 → 서브도메인 화면 0 · 자기 Neture 화면은 그대로', ['neture:admin', 'neture:operator'], [['neture', 'active']], ['netureAdmin', 'netureOperator']],
  ['neture:operator + supplier:operator → 승인 콘솔은 supplier 축으로 열린다', ['neture:operator', 'supplier:operator'], [['neture', 'active'], ['supplier', 'active']], ['approvals', 'netureOperator']],
  ['역할은 있으나 그 서비스 membership 이 없으면 막힌다', ['supplier:admin'], [['neture', 'active']], []],
  ['membership 이 active 가 아니면 막힌다 (suspended)', ['funding:admin'], [['funding', 'suspended']], []],
  ['membership 이 active 가 아니면 막힌다 (pending)', ['supplier:operator'], [['supplier', 'pending']], []],
  ['다른 서비스 membership 으로는 대신할 수 없다 (supplier 역할 + funding membership)', ['supplier:admin'], [['funding', 'active']], []],
  // 권한 경계 정리: 커뮤니티 서비스 관리(개설 심사 · 개별 커뮤니티 운영자 지정)는 community:admin 의 자기 서비스 화면이다.
  ['community:admin + community → 커뮤니티 서비스 관리만', ['community:admin'], [['community', 'active']], ['community']],
  ['community:admin 이어도 community membership pending → 막힌다', ['community:admin'], [['community', 'pending']], []],
  ['Neture 관리자는 커뮤니티 서비스 관리를 대신 열 수 없다', ['neture:admin'], [['neture', 'active'], ['community', 'active']], ['netureAdmin', 'netureOperator']],
];

describe('서브도메인 운영자 화면 guard', () => {
  afterEach(() => cleanup());

  it.each(MATRIX)('%s', (_label, roles, memberships, expected) => {
    authState.user = user(roles, memberships);
    const opened = (Object.keys(SCREENS) as Screen[]).filter((k) => sees(...SCREENS[k]));
    expect(opened).toEqual(expected);
  });

  it('platform:super_admin 은 서브도메인 화면 세 곳을 통과한다 (백엔드 platformBypass 와 같음)', () => {
    authState.user = user(['platform:super_admin'], []);
    for (const k of ['governance', 'approvals', 'funding', 'community'] as const) expect(sees(...SCREENS[k])).toBe(true);
  });

  it('비로그인 → 로그인 화면', () => {
    authState.user = null;
    expect(sees('/admin/supplier-governance', 'login')).toBe(true);
  });
});

describe('역할 표 — 백엔드 scopeRoleMapping 과 같은 의미', () => {
  it('admin ⊃ operator · community 는 admin 단일 계층 · neture 역할 미포함', () => {
    expect(subdomainOperatorRoles('supplier', 'admin')).toEqual(['supplier:admin', 'platform:super_admin']);
    expect(subdomainOperatorRoles('funding', 'operator')).toEqual(['funding:operator', 'funding:admin', 'platform:super_admin']);
    expect(subdomainOperatorRoles('community', 'operator')).toEqual(['community:admin', 'platform:super_admin']);
    for (const r of [...subdomainOperatorRoles('supplier', 'admin'), ...subdomainOperatorRoles('funding', 'operator')]) {
      expect(r.startsWith('neture:')).toBe(false);
    }
  });
});

describe('사이드바 노출 — route guard 와 같은 조건 (범위 역할 + 그 서비스 membership active)', () => {
  const ALL_ACTIVE = [
    { serviceKey: 'neture', status: 'active' },
    { serviceKey: 'supplier', status: 'active' },
    { serviceKey: 'funding', status: 'active' },
  ];
  const v = (roles: string[], memberships = ALL_ACTIVE) => ({ roles, memberships });
  const menu = {
    approvals: [
      { label: '공급자 상태 관리', path: '/admin/supplier-governance' },
      { label: '유통참여형 펀딩', path: '/operator/market-trial' },
      { label: '서비스 승인', path: '/admin/service-approvals' },
    ],
    users: [{ label: '공급자 승인', path: '/operator/suppliers' }],
  };

  it('Neture 역할만 → 서브도메인 항목을 숨기고 나머지는 그대로', () => {
    const out = withoutUnreachableSubdomainOperatorItems(menu, v(['neture:admin']));
    expect(out.approvals?.map((i) => i.path)).toEqual(['/admin/service-approvals']);
    // 공급자 승인도 supplier 축이 됐다 — 메뉴에 남겨 두면 누를 때마다 API 403 이다.
    expect(out.users).toBeUndefined();
  });

  it('supplier 운영자에게는 공급자 승인이 보인다', () => {
    const out = withoutUnreachableSubdomainOperatorItems(menu, v(['supplier:operator', 'supplier:admin']));
    expect(out.users?.map((i) => i.path)).toEqual(['/operator/suppliers']);
    expect(out.approvals?.map((i) => i.path)).toEqual(['/admin/supplier-governance', '/admin/service-approvals']);
  });

  it('범위 역할이 있으면 보인다 (상세 경로 포함)', () => {
    expect(canSeeSubdomainOperatorPath(v(['funding:operator']), '/operator/market-trial/abc')).toBe(true);
    expect(canSeeSubdomainOperatorPath(v(['supplier:admin']), '/admin/supplier-governance')).toBe(true);
    expect(canSeeSubdomainOperatorPath(v(['supplier:admin']), '/operator/market-trial')).toBe(false);
    expect(canSeeSubdomainOperatorPath(v(['supplier:operator']), '/operator/suppliers')).toBe(true);
    expect(canSeeSubdomainOperatorPath(v(['neture:operator']), '/operator/suppliers')).toBe(false);
  });

  // PR #247 리뷰(Codex P2) — 역할만 남은 계정은 route 에서 막히므로 사이드바에도 없다.
  it.each([
    ['membership 없음', []],
    ['pending', [{ serviceKey: 'supplier', status: 'pending' }]],
    ['suspended', [{ serviceKey: 'supplier', status: 'suspended' }]],
  ])('supplier 역할 + supplier membership %s → 숨긴다', (_label, memberships) => {
    const out = withoutUnreachableSubdomainOperatorItems(menu, v(['supplier:admin', 'supplier:operator'], memberships));
    expect(out.users).toBeUndefined();
    expect(out.approvals?.map((i) => i.path)).toEqual(['/admin/service-approvals']);
    expect(canSeeSubdomainOperatorPath(v(['supplier:admin'], memberships), '/admin/supplier-governance')).toBe(false);
  });

  it('platform:super_admin 은 membership 없이 보인다 (기존 예외 유지)', () => {
    expect(canSeeSubdomainOperatorPath(v(['platform:super_admin'], []), '/operator/suppliers')).toBe(true);
    expect(canSeeSubdomainOperatorPath(v(['platform:super_admin'], []), '/operator/market-trial')).toBe(true);
  });

  it('로그인 전(사용자 없음) → 숨긴다', () => {
    expect(canSeeSubdomainOperatorPath(null, '/operator/suppliers')).toBe(false);
    expect(canSeeSubdomainOperatorPath(undefined, '/admin/market-trial-x')).toBe(true); // 범위 화면이 아닌 경로는 판정 대상 아님
  });
});

describe('App.tsx 배선 (정적)', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../../App.tsx'), 'utf-8');
  const blockOf = (open: string) => {
    const start = app.indexOf(open);
    return start < 0 ? '' : app.slice(start, app.indexOf('</Route>', start));
  };

  it('공급자 상태 관리 · alias 는 supplier:admin 블록 안에만 있다', () => {
    const block = blockOf('<SubdomainOperatorRoute serviceKey="supplier" level="admin">');
    for (const p of ['/admin/supplier-governance', '/admin/admin-suppliers', '/admin/supplier-quality']) {
      expect(block).toContain(`path="${p}"`);
      expect(app.split(`path="${p}"`).length - 1).toBe(1);
    }
  });

  it('공급자 승인 콘솔 · alias 는 supplier:operator 블록 안에만 있다', () => {
    const block = blockOf('<SubdomainOperatorRoute serviceKey="supplier" level="operator">');
    for (const p of ['/operator/suppliers', '/operator/supplier-quality']) {
      expect(block).toContain(`path="${p}"`);
      expect(app.split(`path="${p}"`).length - 1).toBe(1);
    }
  });

  it('펀딩 운영 화면 · alias 는 funding:operator 블록 안에만 있다', () => {
    const block = blockOf('<SubdomainOperatorRoute serviceKey="funding" level="operator">');
    for (const p of ['/operator/market-trial', '/operator/market-trial/:id', '/admin/market-trial']) {
      expect(block).toContain(`path="${p}"`);
      expect(app.split(`path="${p}"`).length - 1).toBe(1);
    }
  });

  it('커뮤니티 서비스 관리 화면은 community:admin 블록 안에만 있다', () => {
    const block = blockOf('<SubdomainOperatorRoute serviceKey="community" level="admin">');
    expect(block).toContain('path="/admin/communities"');
    expect(app.split('path="/admin/communities"').length - 1).toBe(1);
  });
});
