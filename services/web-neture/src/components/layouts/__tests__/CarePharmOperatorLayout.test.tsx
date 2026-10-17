import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
const state = vi.hoisted(() => ({ host: 'carepharm', switcher: vi.fn() }));
vi.mock('../../../lib/hostProfile', () => ({ get CURRENT_HOST_PROFILE() { return state.host; } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator' } }) }));
vi.mock('../../../config/operatorCapabilities', () => ({ ENABLED_CAPABILITIES: [] }));
vi.mock('../../../config/operatorMenuGroups', () => ({ UNIFIED_MENU: { dashboard: [{ label: 'Neture 전체 업무', path: '/operator' }] }, NETURE_OPERATOR_DOMAIN_IA: {} }));
vi.mock('../../../lib/role-constants', () => ({ withoutUnreachableSubdomainOperatorItems: (items: unknown) => items }));
vi.mock('../../NetureGlobalHeader', () => ({ NetureGlobalHeader: () => <header>서비스 헤더</header> }));
vi.mock('../../NetureBottomNav', () => ({ NetureBottomNav: () => null }));
vi.mock('../../../pages/carepharm/CarePharmStudyEntry', () => ({ default: () => <p>Study 연결</p> }));
vi.mock('../../../lib/apiClient', () => ({ api: {} }));
vi.mock('@o4o/operator-ux-core', () => ({
  createOperatorServicesApi: () => ({}),
  OperatorServiceSwitcher: (props: unknown) => { state.switcher(props); return <p>서비스 전환</p>; },
  OperatorAreaShell: ({ menuItems, children, header }: any) => <>{header}<nav>{Object.values(menuItems).flat().map((item: any) => <a key={item.path} href={item.path}>{item.label}</a>)}</nav>{children ?? <Outlet />}</>,
}));
import OperatorLayout from '../OperatorLayoutWrapper';
function Business() { const location = useLocation(); return <p>사업 업무{location.search}</p>; }
function mount(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<OperatorLayout />}>
    <Route path="/operator" element={<p>대표 대시보드</p>} />
    <Route path="/operator/semi-franchises" element={<Business />} />
    <Route path="/operator/members" element={<p>전체 회원 조회</p>} />
  </Route></Routes></MemoryRouter>);
}
afterEach(() => { cleanup(); state.host = 'carepharm'; state.switcher.mockClear(); });
it.each(['/operator', '/operator/members'])('CarePharm routes %s to assigned-business work before mounting representative consoles', async path => {
  mount(path);
  await screen.findByText('사업 업무?key=carepharm&tab=memberships');
  expect(screen.queryByText('대표 대시보드')).toBeNull(); expect(screen.queryByText('전체 회원 조회')).toBeNull();
  expect(screen.getByRole('link', { name: '회원 커뮤니티 운영' }).getAttribute('href')).toBe('/communities/business%3Acarepharm/forum');
  expect(screen.queryByText('Neture 전체 업무')).toBeNull(); expect(state.switcher).not.toHaveBeenCalled();
});
it('preserves the existing Neture layout and service switcher on the representative host', () => {
  state.host = 'main'; mount('/operator');
  expect(screen.getByText('대표 대시보드')).toBeTruthy(); expect(screen.getByText('Neture 전체 업무')).toBeTruthy();
  expect(state.switcher).toHaveBeenCalledWith(expect.objectContaining({ currentServiceKey: 'neture' }));
});
