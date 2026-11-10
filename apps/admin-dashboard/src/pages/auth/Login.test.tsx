import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const auth = {
  loginWithGoogle: vi.fn(), getGoogleAuthConfig: vi.fn(), clearError: vi.fn(), logout: vi.fn(),
  isAuthenticated: false, isLoading: false, error: null, user: null as null | { id: string; roles: string[] }, sessionConflict: false,
};
vi.mock('@o4o/auth-context', () => ({ useAuth: () => auth }));
const loadGoogleIdentityScript = vi.fn(() => Promise.resolve({}));
vi.mock('@o4o/auth-client', () => ({ loadGoogleIdentityScript: () => loadGoogleIdentityScript(), renderGoogleButton: vi.fn(() => Promise.resolve(() => undefined)) }));
vi.mock('@o4o/auth-react', () => ({
  LoginLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LoginCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
import OperatorsToOperations from '../../components/OperatorsToOperations';
import Login from './Login';

function Where() { const l = useLocation(); return <p>at:{l.pathname}{l.search}</p>; }
function view(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<><Login /><Where /></>} />
    <Route path="/operations" element={<p>operations</p>} />
    <Route path="/admin" element={<OperatorsToOperations><p>admin home</p></OperatorsToOperations>} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  Object.assign(auth, { isAuthenticated: false, user: null });
  auth.getGoogleAuthConfig.mockResolvedValue({ enabled: true, clientId: 'synthetic-client' });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('starts loading the Google script at once and asks for the config only once', async () => {
  const { rerender } = view('/login');
  expect(loadGoogleIdentityScript).toHaveBeenCalledTimes(1);
  // 세션 확인이 끝나 다시 그려져도 설정 요청을 다시 시작하지 않는다.
  auth.getGoogleAuthConfig = vi.fn().mockResolvedValue({ enabled: true, clientId: 'synthetic-client' });
  rerender(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByTestId('google-continue-button')).toBeTruthy());
  expect(auth.getGoogleAuthConfig).not.toHaveBeenCalled();
});

it('logs out a member without delegation, explains why and clears the flag', async () => {
  Object.assign(auth, { isAuthenticated: true, user: { id: 'member', roles: [] } });
  auth.logout.mockImplementation(() => Object.assign(auth, { isAuthenticated: false, user: null }));
  const { rerender } = view('/login?denied=operators-only');
  expect(auth.logout).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('operators-only-notice')).toHaveTextContent('전체 관리자와 운영자만 이용할 수 있습니다');
  await act(async () => { rerender(<MemoryRouter initialEntries={['/login?denied=operators-only']}><Routes><Route path="/login" element={<><Login /><Where /></>} /></Routes></MemoryRouter>); });
  await waitFor(() => expect(screen.getByText('at:/login')).toBeTruthy());
  expect(screen.getByTestId('operators-only-notice')).toBeTruthy();
});

it('sends a signed-in operator who opens an admin page to the operations screen', () => {
  Object.assign(auth, { isAuthenticated: true, user: { id: 'operator', roles: ['supplier:operator'] } });
  view('/admin');
  expect(screen.getByText('operations')).toBeTruthy();
});

it('keeps the platform admin on the admin page', () => {
  Object.assign(auth, { isAuthenticated: true, user: { id: 'admin', roles: ['platform:super_admin'] } });
  view('/admin');
  expect(screen.getByText('admin home')).toBeTruthy();
});
