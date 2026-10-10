import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  callback: undefined as (() => void) | undefined,
  roles: ['kpa:store_owner'], close: vi.fn(), mark: vi.fn(),
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }), authClient: { api: {} },
}));
vi.mock('../../../contexts/AuthModalContext', () => ({
  useAuthModal: () => ({ activeModal: 'login', closeModal: mocks.close, onLoginSuccess: mocks.callback, markLoginNavigationHandled: mocks.mark }),
}));
vi.mock('@o4o/auth-react', () => ({
  O4OHomeButton: () => null,
  LoginMethods: ({ onSuccess }: { onSuccess: (user: unknown) => void }) => <button type="button" onClick={() => onSuccess({ roles: mocks.roles })}>샘플 로그인 완료</button>,
}));
import LoginModal from '../../LoginModal';

beforeEach(() => { mocks.roles = ['kpa:store_owner']; mocks.callback = undefined; mocks.close.mockReset(); mocks.mark.mockReset(); });
afterEach(cleanup);
function mount() {
  render(<MemoryRouter initialEntries={['/login']}><LoginModal /><Routes>
    <Route path="/" element={<p>회원 초기화면</p>} />
    <Route path="/login" element={<p>로그인 경로</p>} />
    <Route path="/operator" element={<p>운영 업무 화면</p>} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '샘플 로그인 완료' }));
}
it('약국 경영자의 기본 로그인은 내 매장이 아닌 회원 초기화면으로 완료된다', () => {
  mount(); expect(screen.getByText('회원 초기화면')).toBeTruthy(); expect(mocks.close).toHaveBeenCalledOnce();
});
it('명시적 복귀 콜백을 기본 화면 이동보다 우선 실행한다', () => {
  mocks.callback = vi.fn(); mount(); expect(mocks.callback).toHaveBeenCalledOnce();
  expect(mocks.mark).toHaveBeenCalledOnce();
  expect(screen.queryByText('회원 초기화면')).toBeNull();
});
it('운영자는 기존 기본 업무 화면으로 이동한다', () => {
  mocks.roles = ['kpa:operator', 'kpa:store_owner']; mount(); expect(screen.getByText('운영 업무 화면')).toBeTruthy();
});
