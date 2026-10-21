import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ roles: ['neture:admin'], settings: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({
  isAuthenticated: true, isLoading: false, user: { id: 'fixture', roles: state.roles },
}) }));
vi.mock('@o4o/operator-core-ui/modules/pharmacy-management/AdminPharmacyServiceSettingsPage', () => ({
  default: () => { state.settings(); return <h1>설정 화면</h1>; },
}));
vi.mock('@o4o/ui', () => ({ AccessDenied: () => <p>접근 권한 필요</p> }));
import Page from '../AdminPharmacyServiceSettingsPage';
import { getAdminMenu } from '../../../config/operatorMenuGroups';
beforeEach(() => { vi.clearAllMocks(); state.roles = ['neture:admin']; });
afterEach(cleanup);

it('hides the platform-only feature policy menu from a Neture-only administrator', () => {
  expect(Object.values(getAdminMenu(false)).flat().some(item => item.path === '/admin/pharmacy-service-settings')).toBe(false);
  expect(getAdminMenu(false).stores?.some(item => item.path === '/admin/semi-franchises')).toBe(false);
});
it('offers the service policy entry to a platform administrator', () => {
  expect(getAdminMenu(true).stores?.some(item => item.path === '/admin/pharmacy-service-settings')).toBe(true);
});
it('blocks a direct URL before mounting the settings page for a Neture-only administrator', () => {
  render(<MemoryRouter><Page /></MemoryRouter>);
  expect(screen.getByText('접근 권한 필요')).toBeTruthy(); expect(state.settings).not.toHaveBeenCalled();
});
it('mounts the settings page for a platform administrator', () => {
  state.roles = ['platform:super_admin']; render(<MemoryRouter><Page /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: '설정 화면' })).toBeTruthy(); expect(state.settings).toHaveBeenCalled();
});
