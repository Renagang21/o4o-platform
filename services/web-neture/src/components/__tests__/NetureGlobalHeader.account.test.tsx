import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({ profile: 'carepharm', logout: vi.fn(), user: { id: 'fixture-account', displayName: '검증용 회원', email: 'member@example.invalid', roles: [], demo: { isDemo: true } } }));
vi.mock('../../lib/hostProfile', () => ({ get CURRENT_HOST_PROFILE() { return state.profile; } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user, isAuthenticated: true, isLoading: false, logout: state.logout }) }));
vi.mock('../../contexts/LoginModalContext', () => ({ useLoginModal: () => ({ openLoginModal: vi.fn() }) }));
vi.mock('../../lib/apiClient', () => ({ api: {}, API_BASE_URL: 'https://api.example.invalid' }));
vi.mock('@o4o/account-ui', async original => ({ ...await original<typeof import('@o4o/account-ui')>(), NotificationBell: () => <button>알림</button>, useNotifications: () => ({}) }));
vi.mock('@o4o/auth-react', async original => ({ ...await original<typeof import('@o4o/auth-react')>(), MyHomeButton: () => <button>My Home</button>, O4OHomeButton: () => <button>O4O 메인으로</button> }));
import { NetureGlobalHeader } from '../NetureGlobalHeader';
afterEach(cleanup);

it.each(['main', 'supplier', 'funding', 'community', 'carepharm'])('%s shows one named account menu and keeps Demo notice inside it', profile => {
  state.profile = profile;
  render(<MemoryRouter><NetureGlobalHeader /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: '계정 메뉴' });
  expect(within(trigger).getByText('검증용 회원')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '사용자 메뉴' })).toBeNull();
  expect(screen.queryByText('Demo 계정')).toBeNull();
  fireEvent.click(trigger);
  expect(within(screen.getByRole('menu')).getByText('Demo 계정')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: '계정 메뉴' })).toHaveLength(1);
  expect(within(screen.getByRole('menu')).getByText('설정')).toBeTruthy();
});
