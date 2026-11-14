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

it('explains a slow server start after 5 seconds and shows the button once the config arrives', async () => {
  vi.useFakeTimers();
  try {
    let answer!: (value: { enabled: boolean; clientId: string | null }) => void;
    auth.getGoogleAuthConfig.mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    view('/login');
    expect(screen.queryByTestId('google-continue-slow')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByTestId('google-continue-slow')).toHaveTextContent('서버를 깨우는 중입니다');
    await act(async () => { answer({ enabled: true, clientId: 'synthetic-client' }); });
    expect(screen.getByTestId('google-continue-button')).toBeTruthy();
    expect(screen.queryByTestId('google-continue-slow')).toBeNull();
  } finally { vi.useRealTimers(); }
});

it('retries the config automatically and shows the button when a later attempt succeeds', async () => {
  vi.useFakeTimers();
  try {
    auth.getGoogleAuthConfig
      .mockResolvedValueOnce({ enabled: false, clientId: null })
      .mockResolvedValueOnce({ enabled: true, clientId: 'synthetic-client' });
    view('/login');
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('google-continue-retrying')).toHaveTextContent('(2/3)');
    await act(async () => { vi.advanceTimersByTime(3_000); });
    expect(auth.getGoogleAuthConfig).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('google-continue-button')).toBeTruthy();
  } finally { vi.useRealTimers(); }
});

it('after 3 failed attempts offers a manual retry that asks again', async () => {
  vi.useFakeTimers();
  try {
    auth.getGoogleAuthConfig.mockResolvedValue({ enabled: false, clientId: null });
    view('/login');
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(3_000); });
    await act(async () => { vi.advanceTimersByTime(3_000); });
    expect(auth.getGoogleAuthConfig).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('google-continue-disabled')).toBeTruthy();
    auth.getGoogleAuthConfig.mockResolvedValue({ enabled: true, clientId: 'synthetic-client' });
    await act(async () => { screen.getByRole('button', { name: '다시 시도' }).click(); });
    expect(auth.getGoogleAuthConfig).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId('google-continue-button')).toBeTruthy();
  } finally { vi.useRealTimers(); }
});
