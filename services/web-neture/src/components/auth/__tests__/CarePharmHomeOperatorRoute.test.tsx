import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'neture:carepharm_operator' }));
vi.mock('../../../lib/hostProfile', () => ({ CURRENT_HOST_PROFILE: 'carepharm' }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'operator', name: 'Fixture', roles: [state.role], memberships: [{ serviceKey: 'neture', status: 'active' }] },
  isAuthenticated: true, isLoading: false,
}) }));
import { OperatorRoute } from '../RoleGuard';
afterEach(cleanup);
it.each([
  ['neture:carepharm_operator', '/operator/home-presentation/carepharm', true],
  ['neture:carepharm_admin', '/operator/home-presentation/carepharm', true],
  ['neture:carepharm_operator', '/operator/home-presentation/carepharm/', true],
  ['neture:carepharm_admin', '/operator/home-presentation/carepharm/', true],
  ['neture:pharmacy_operator', '/operator/home-presentation/carepharm/', false],
  ['neture:pharmacy_operator', '/operator/home-presentation/carepharm', false],
  ['neture:carepharm_operator', '/operator/members', false],
] as const)('applies %s only to its business-owned editor at %s', (role, path, allowed) => {
  state.role = role;
  render(<MemoryRouter initialEntries={[path]}><OperatorRoute><p>홈 편집 화면</p></OperatorRoute></MemoryRouter>);
  expect(!!screen.queryByText('홈 편집 화면')).toBe(allowed);
});
