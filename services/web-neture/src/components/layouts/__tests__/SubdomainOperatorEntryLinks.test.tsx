/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — PR #243 리뷰 3건(화면 연결) 회귀 고정
 *
 * 공급자 승인 · 상태 관리 · 펀딩 화면은 `supplier:*` · `funding:*` 범위 화면이다.
 *   ① Neture 회원 관리 — 범위 역할이 없으면 공급자 조회 API 를 부르지 않고 공급자 컬럼 · CTA 를 그리지 않는다.
 *   ② Neture 운영자 · 관리자 대시보드 — 범위 역할이 없으면 그 화면으로 가는 링크(축 · KPI · 대기열 ·
 *      AI 요약 · 바로가기 · 정책 · 구조 조치)를 보여주지 않는다.
 *   ③ 서브도메인 전용 셸 — `supplier:operator` 에게 admin 전용 「공급자 상태 관리」 를 보여주지 않는다.
 * Neture 역할로 범위 화면을 대신 열지 않는다(fallback 0). 운영 DB · 네트워크 0.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';
import type { AdminDashboardConfig } from '@o4o/admin-ux-core';

const { authState, getSuppliers, consoleProps, shellProps } = vi.hoisted(() => ({
  authState: { roles: [] as string[] },
  getSuppliers: vi.fn(),
  consoleProps: {} as { extraColumns?: Array<{ key: string }> },
  shellProps: {} as { menuItems?: Record<string, Array<{ label: string; path: string }>> },
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', roles: authState.roles }, isAuthenticated: true, isLoading: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', roles: authState.roles }, isAuthenticated: true, isLoading: false }),
}));

vi.mock('@/lib/api/admin', () => ({ operatorSupplierApi: { getSuppliers: () => getSuppliers() } }));
vi.mock('@/lib/apiClient', () => ({ api: {} }));
vi.mock('../../../lib/apiClient', () => ({ api: {} }));
vi.mock('../../../pages/operator/EditUserModal', () => ({ default: () => null }));

vi.mock('@o4o/operator-core-ui/modules/members', () => ({
  OperatorMembersConsolePage: (props: { extraColumns?: Array<{ key: string }> }) => {
    consoleProps.extraColumns = props.extraColumns;
    return <div data-testid="members-console" />;
  },
  OperatorMemberSoftDeleteFlow: () => null,
}));

vi.mock('@o4o/operator-ux-core', () => ({
  OperatorAreaShell: (props: { menuItems: Record<string, Array<{ label: string; path: string }>> }) => {
    shellProps.menuItems = props.menuItems;
    return <div data-testid="scoped-shell" />;
  },
}));
// 대시보드 레이아웃 렌더는 이 테스트 대상이 아니다(링크 필터 함수만 본다) — 빌드 산출물 의존을 끊는다.
vi.mock('@o4o/operator-core-ui', () => ({ AxisNavigationSection: () => null }));
vi.mock('@o4o/admin-ux-core', () => ({ AdminDashboardLayout: () => null }));
vi.mock('../../../config/operatorCapabilities', () => ({ ENABLED_CAPABILITIES: [] }));
vi.mock('../../../config/operatorMenuGroups', () => ({ NETURE_OPERATOR_DOMAIN_IA: {} }));
vi.mock('../../NetureGlobalHeader', () => ({ NetureGlobalHeader: () => null }));
vi.mock('../../NetureBottomNav', () => ({ NetureBottomNav: () => null }));
vi.mock('../AdminLayoutWrapper', () => ({ default: () => <div data-testid="neture-admin-layout" /> }));
vi.mock('../OperatorLayoutWrapper', () => ({ default: () => <div data-testid="neture-operator-layout" /> }));

import { withoutUnreachableSubdomainOperatorLinks } from '../../../lib/role-constants';
import { withReachableLinks, reachableNetureAxes } from '../../../pages/operator/NetureOperatorDashboard';
import { withReachableAdminLinks } from '../../../pages/admin/AdminDashboardPage';
import UsersManagementPage from '../../../pages/operator/UsersManagementPage';
import SubdomainOperatorLayoutWrapper from '../SubdomainOperatorLayoutWrapper';

// 백엔드 operator-dashboard.controller 가 내는 모양 그대로(링크 값만).
const operatorConfig = (): OperatorDashboardConfig => ({
  kpis: [
    { key: 'active-suppliers', label: '활성 공급사', value: 1, link: '/operator/suppliers' },
    { key: 'pending-trials', label: 'Market Trial 심사 대기', value: 1, link: '/operator/market-trial' },
    { key: 'products', label: '상품', value: 1, link: '/operator/all-registered-products' },
    { key: 'orders', label: '주문', value: 1 },
  ],
  aiSummary: [{ id: 'ai-s', message: '공급사 승인 대기', level: 'warning', link: '/operator/suppliers' }],
  actionQueue: [
    { id: 'pending-suppliers', label: '공급사 승인 대기', count: 1, link: '/operator/suppliers', actionUrl: '/operator/suppliers' },
    { id: 'pending-trials', label: 'Market Trial', count: 1, link: '/operator/market-trial' },
    { id: 'product-approvals', label: '상품 승인', count: 1, link: '/operator/product-approvals' },
  ] as OperatorDashboardConfig['actionQueue'],
  activityLog: [],
  quickActions: [
    { id: 'go-suppliers', label: '공급사 승인', link: '/operator/suppliers' },
    { id: 'go-market-trial', label: 'Market Trial', link: '/operator/market-trial' },
    { id: 'go-orders', label: '주문', link: '/operator/orders' },
  ],
});

const adminConfig = (): AdminDashboardConfig =>
  ({
    structureMetrics: [],
    policies: [
      { key: 'pending-suppliers', label: '공급사 승인 대기', status: 'partial', link: '/admin/supplier-governance' },
      { key: 'pending-regs', label: '가입 승인 대기', status: 'configured', link: '/admin/applications' },
    ],
    governanceAlerts: [],
    structureActions: [
      { id: 'manage-users', label: '사용자 관리', link: '/admin/users', icon: 'users' },
      { id: 'manage-suppliers', label: '공급사 승인', link: '/admin/supplier-governance', icon: 'store' },
    ],
  }) as unknown as AdminDashboardConfig;

const links = (items: Array<{ link?: string }> | undefined) => (items ?? []).map((i) => i.link);

afterEach(() => cleanup());

describe('링크 필터 헬퍼', () => {
  it('link · actionUrl · href 중 하나라도 닿지 않는 범위 화면이면 뺀다 · 링크 없는 항목은 둔다', () => {
    const items = [
      { id: 'a', link: '/operator/orders', actionUrl: '/operator/suppliers' },
      { id: 'b', href: '/admin/supplier-governance' },
      { id: 'c' },
      { id: 'd', link: '/operator/orders' },
    ];
    expect(withoutUnreachableSubdomainOperatorLinks(items, ['neture:admin']).map((i) => i.id)).toEqual(['c', 'd']);
    expect(withoutUnreachableSubdomainOperatorLinks(items, ['supplier:admin']).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('② Neture 운영자 대시보드', () => {
  it('neture:operator 만 → 공급자 승인 · 펀딩 링크를 모든 블록에서 뺀다 (나머지는 그대로)', () => {
    const c = withReachableLinks(operatorConfig(), ['neture:operator']);
    expect(links(c.kpis)).toEqual(['/operator/all-registered-products', undefined]);
    expect(c.aiSummary).toEqual([]);
    expect(links(c.actionQueue)).toEqual(['/operator/product-approvals']);
    expect(links(c.quickActions)).toEqual(['/operator/orders']);
    const axisHrefs = reachableNetureAxes(['neture:operator']).flatMap((a) => a.links.map((l) => l.href));
    expect(axisHrefs).not.toContain('/operator/suppliers');
    expect(axisHrefs).toContain('/operator/orders');
  });

  it('neture:admin 도 supplier 역할이 없으면 공급자 승인 링크를 못 본다 (Neture fallback 0)', () => {
    const c = withReachableLinks(operatorConfig(), ['neture:admin']);
    expect(links(c.quickActions)).not.toContain('/operator/suppliers');
  });

  it('supplier:operator 가 있으면 공급자 승인 링크가 보이고, 펀딩은 funding 역할이 있어야 보인다', () => {
    const c = withReachableLinks(operatorConfig(), ['neture:operator', 'supplier:operator']);
    expect(links(c.quickActions)).toEqual(['/operator/suppliers', '/operator/orders']);
    expect(links(c.actionQueue)).toContain('/operator/suppliers');
    const both = withReachableLinks(operatorConfig(), ['neture:operator', 'supplier:operator', 'funding:operator']);
    expect(links(both.quickActions)).toEqual(['/operator/suppliers', '/operator/market-trial', '/operator/orders']);
    expect(reachableNetureAxes(['neture:operator', 'supplier:operator']).flatMap((a) => a.links.map((l) => l.href))).toContain(
      '/operator/suppliers',
    );
  });
});

describe('② Neture 관리자 대시보드', () => {
  it('neture:admin 만 → 공급자 상태 관리 링크를 정책 · 구조 조치에서 뺀다', () => {
    const c = withReachableAdminLinks(adminConfig(), ['neture:admin']);
    expect(links(c.policies)).toEqual(['/admin/applications']);
    expect(links(c.structureActions)).toEqual(['/admin/users']);
  });

  it('supplier:operator 로는 부족하다 — supplier:admin 이어야 보인다', () => {
    expect(links(withReachableAdminLinks(adminConfig(), ['neture:admin', 'supplier:operator']).structureActions)).toEqual([
      '/admin/users',
    ]);
    expect(links(withReachableAdminLinks(adminConfig(), ['neture:admin', 'supplier:admin']).structureActions)).toEqual([
      '/admin/users',
      '/admin/supplier-governance',
    ]);
  });
});

describe('③ 서브도메인 전용 셸 메뉴', () => {
  const menuPaths = () => Object.values(shellProps.menuItems ?? {}).flat().map((i) => i.path);

  it('supplier:operator 만 → 공급자 승인만 보이고 admin 전용 공급자 상태 관리는 숨긴다', () => {
    authState.roles = ['supplier:operator'];
    render(<SubdomainOperatorLayoutWrapper serviceKey="supplier" area="operator" />);
    expect(screen.getByTestId('scoped-shell')).toBeTruthy();
    expect(menuPaths()).toEqual(['/operator/suppliers']);
  });

  it('supplier:admin → 두 항목 모두 보인다', () => {
    authState.roles = ['supplier:admin'];
    render(<SubdomainOperatorLayoutWrapper serviceKey="supplier" area="admin" />);
    expect(menuPaths()).toEqual(['/operator/suppliers', '/admin/supplier-governance']);
  });

  it('funding:operator → 펀딩 항목', () => {
    authState.roles = ['funding:operator'];
    render(<SubdomainOperatorLayoutWrapper serviceKey="funding" area="operator" />);
    expect(menuPaths()).toEqual(['/operator/market-trial']);
  });
});

describe('① Neture 회원 관리의 공급자 정보', () => {
  beforeEach(() => {
    getSuppliers.mockReset();
    getSuppliers.mockResolvedValue([
      { userId: 'u-p', status: 'PENDING', name: '대기 공급사' },
      { userId: 'u-a', status: 'ACTIVE', name: '활성 공급사' },
    ]);
    consoleProps.extraColumns = undefined;
  });

  const mountPage = () =>
    render(
      <MemoryRouter>
        <UsersManagementPage />
      </MemoryRouter>,
    );

  it('neture:operator 만 → 공급자 조회 API 를 부르지 않고 공급자 컬럼 · 승인 CTA 가 없다', async () => {
    authState.roles = ['neture:operator'];
    mountPage();
    await waitFor(() => expect(screen.getByTestId('members-console')).toBeTruthy());
    expect(getSuppliers).not.toHaveBeenCalled();
    expect(consoleProps.extraColumns).toEqual([]);
    expect(screen.queryByText(/공급자 승인 관리로 이동/)).toBeNull();
  });

  it('supplier:operator 가 있으면 조회하고 회사명 · 공급자 프로필 컬럼과 대기 CTA 를 그린다', async () => {
    authState.roles = ['neture:operator', 'supplier:operator'];
    mountPage();
    await waitFor(() => expect(screen.getByText(/공급자 승인 관리로 이동/)).toBeTruthy());
    expect(getSuppliers).toHaveBeenCalledTimes(1);
    expect(consoleProps.extraColumns?.map((c) => c.key)).toEqual(['companyName', 'supplierProfile']);
    expect(screen.getByText(/공급 승인 대기 1건/)).toBeTruthy();
  });
});
