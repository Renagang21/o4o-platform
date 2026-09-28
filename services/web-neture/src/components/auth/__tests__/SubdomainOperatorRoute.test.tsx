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

describe('서브도메인 운영자 화면 guard', () => {
  afterEach(() => cleanup());

  it('supplier:admin + supplier membership 만 → 공급자 화면 두 곳을 연다 (상태 관리 + 승인 콘솔)', () => {
    authState.user = user(['supplier:admin'], [['supplier', 'active']]);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(true);
    expect(sees('/operator/suppliers', 'supplier-approvals')).toBe(true);
    expect(sees('/operator/market-trial', 'funding')).toBe(false);
    expect(sees('/admin', 'neture-admin')).toBe(false);
    expect(sees('/operator', 'neture-operator')).toBe(false);
  });

  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (잔여 gap): 상태 관리만 옮겨 두면
  // supplier 운영자가 **목록은 보고 승인은 못 하는** 상태가 된다 — 화면과 API 가 같은 축이어야 한다.
  it('supplier:operator + supplier membership 만 → 승인 콘솔 O · 상태 관리 X', () => {
    authState.user = user(['supplier:operator'], [['supplier', 'active']]);
    expect(sees('/operator/suppliers', 'supplier-approvals')).toBe(true);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(false);
    expect(sees('/operator/market-trial', 'funding')).toBe(false);
    expect(sees('/operator', 'neture-operator')).toBe(false);
  });

  it('funding:admin + funding membership 만 → 펀딩 운영 화면만 연다 (admin ⊃ operator)', () => {
    authState.user = user(['funding:admin'], [['funding', 'active']]);
    expect(sees('/operator/market-trial', 'funding')).toBe(true);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(false);
    expect(sees('/admin', 'neture-admin')).toBe(false);
    expect(sees('/operator', 'neture-operator')).toBe(false);
  });

  it('funding:operator 도 펀딩 운영 화면에 들어온다', () => {
    authState.user = user(['funding:operator'], [['funding', 'active']]);
    expect(sees('/operator/market-trial', 'funding')).toBe(true);
  });

  it('supplier:operator 는 공급자 상태 관리(supplier:admin 화면)에 못 들어온다', () => {
    authState.user = user(['supplier:operator'], [['supplier', 'active']]);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(false);
  });

  it('Neture 관리자·운영자 역할만 → 세 화면 모두 막힌다 (자기 Neture 화면은 그대로)', () => {
    authState.user = user(['neture:admin', 'neture:operator'], [['neture', 'active']]);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(false);
    expect(sees('/operator/suppliers', 'supplier-approvals')).toBe(false);
    expect(sees('/operator/market-trial', 'funding')).toBe(false);
    expect(sees('/admin', 'neture-admin')).toBe(true);
    expect(sees('/operator', 'neture-operator')).toBe(true);
  });

  it('역할은 있으나 그 서비스 membership 이 없거나 active 가 아니면 막힌다', () => {
    authState.user = user(['supplier:admin'], [['neture', 'active']]);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(false);
    authState.user = user(['funding:admin'], [['funding', 'suspended']]);
    expect(sees('/operator/market-trial', 'funding')).toBe(false);
  });

  it('다른 서비스 membership 으로는 대신할 수 없다 (supplier 역할 + funding membership)', () => {
    authState.user = user(['supplier:admin'], [['funding', 'active']]);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(false);
    expect(sees('/operator/suppliers', 'supplier-approvals')).toBe(false);
  });

  it('funding 역할로는 공급자 승인 콘솔에 못 들어온다 (교차 0)', () => {
    authState.user = user(['funding:admin'], [['funding', 'active']]);
    expect(sees('/operator/suppliers', 'supplier-approvals')).toBe(false);
  });

  it('platform:super_admin 은 통과한다 (백엔드 platformBypass 와 같음)', () => {
    authState.user = user(['platform:super_admin'], []);
    expect(sees('/admin/supplier-governance', 'supplier-governance')).toBe(true);
    expect(sees('/operator/suppliers', 'supplier-approvals')).toBe(true);
    expect(sees('/operator/market-trial', 'funding')).toBe(true);
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

describe('사이드바 노출', () => {
  const menu = {
    approvals: [
      { label: '공급자 상태 관리', path: '/admin/supplier-governance' },
      { label: '유통참여형 펀딩', path: '/operator/market-trial' },
      { label: '서비스 승인', path: '/admin/service-approvals' },
    ],
    users: [{ label: '공급자 승인', path: '/operator/suppliers' }],
  };

  it('Neture 역할만 → 서브도메인 항목을 숨기고 나머지는 그대로', () => {
    const out = withoutUnreachableSubdomainOperatorItems(menu, ['neture:admin']);
    expect(out.approvals?.map((i) => i.path)).toEqual(['/admin/service-approvals']);
    // 공급자 승인도 supplier 축이 됐다 — 메뉴에 남겨 두면 누를 때마다 API 403 이다.
    expect(out.users).toBeUndefined();
  });

  it('supplier 운영자에게는 공급자 승인이 보인다', () => {
    const out = withoutUnreachableSubdomainOperatorItems(menu, ['supplier:operator', 'supplier:admin']);
    expect(out.users?.map((i) => i.path)).toEqual(['/operator/suppliers']);
    expect(out.approvals?.map((i) => i.path)).toEqual(['/admin/supplier-governance', '/admin/service-approvals']);
  });

  it('범위 역할이 있으면 보인다 (상세 경로 포함)', () => {
    expect(canSeeSubdomainOperatorPath(['funding:operator'], '/operator/market-trial/abc')).toBe(true);
    expect(canSeeSubdomainOperatorPath(['supplier:admin'], '/admin/supplier-governance')).toBe(true);
    expect(canSeeSubdomainOperatorPath(['supplier:admin'], '/operator/market-trial')).toBe(false);
    expect(canSeeSubdomainOperatorPath(['supplier:operator'], '/operator/suppliers')).toBe(true);
    expect(canSeeSubdomainOperatorPath(['neture:operator'], '/operator/suppliers')).toBe(false);
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
});
