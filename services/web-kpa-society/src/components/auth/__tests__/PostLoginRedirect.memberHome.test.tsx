import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ auth: { user: null as null | { roles: string[] }, isAuthenticated: false, isKpaContextLoaded: false, isLoading: false } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mocks.auth, authClient: { api: {} } }));
vi.mock('@o4o/auth-react', () => ({
  O4OHomeButton: () => null,
  LoginMethods: ({ onSuccess }: { onSuccess: (user: unknown) => void }) => <button type="button" onClick={() => {
    mocks.auth = { ...mocks.auth, isAuthenticated: true, isKpaContextLoaded: true };
    onSuccess(mocks.auth.user);
  }}>샘플 인증 완료</button>,
}));
import { AuthModalProvider, useAuthModal } from '../../../contexts/AuthModalContext';
import PostLoginRedirect from '../../PostLoginRedirect';
import LoginModal from '../../LoginModal';

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function ExplicitLogin() {
  const navigate = useNavigate();
  const { setOnLoginSuccess, openLoginModal } = useAuthModal();
  useEffect(() => { setOnLoginSuccess(() => navigate('/mypage/profile')); openLoginModal(); }, []);
  return null;
}
const fallbackTree = () => <AuthModalProvider><PostLoginRedirect /><Location /></AuthModalProvider>;
beforeEach(() => { mocks.auth = { user: null, isAuthenticated: false, isKpaContextLoaded: false, isLoading: false }; });
afterEach(cleanup);

it.each([['kpa:store_owner'], ['kpa:operator']])('모달 닫기와 인증 완료가 함께 발생해도 상세 복귀 경로를 보존한다: %s', role => {
  mocks.auth.user = { roles: [role] };
  render(<MemoryRouter initialEntries={['/login']}><AuthModalProvider>
    <PostLoginRedirect /><LoginModal /><Location /><Routes><Route path="/login" element={<ExplicitLogin />} /><Route path="*" element={null} /></Routes>
  </AuthModalProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '샘플 인증 완료' }));
  expect(screen.getByTestId('location').textContent).toBe('/mypage/profile');
});
it('일반 회원의 저장된 세션 복원은 현재 상세 URL을 바꾸지 않는다', () => {
  const tree = () => <MemoryRouter initialEntries={['/mypage/profile']}>{fallbackTree()}</MemoryRouter>;
  const result = render(tree());
  mocks.auth = { ...mocks.auth, user: { roles: ['kpa:store_owner'] }, isAuthenticated: true, isKpaContextLoaded: true };
  result.rerender(tree()); expect(screen.getByTestId('location').textContent).toBe('/mypage/profile');
});
it('완료된 모달 이동이 없는 운영자 fallback은 늦게 도착한 컨텍스트를 기다린다', () => {
  const tree = () => <MemoryRouter initialEntries={['/contact']}>{fallbackTree()}</MemoryRouter>;
  const result = render(tree());
  mocks.auth = { ...mocks.auth, user: { roles: ['kpa:operator'] }, isAuthenticated: true };
  result.rerender(tree()); expect(screen.getByTestId('location').textContent).toBe('/contact');
  mocks.auth = { ...mocks.auth, isKpaContextLoaded: true };
  result.rerender(tree()); expect(screen.getByTestId('location').textContent).toBe('/operator');
});
function CompletionProbe() {
  const modal = useAuthModal();
  return <><output data-testid="handled">{String(modal.loginNavigationHandled)}</output>
    <button onClick={() => { modal.markLoginNavigationHandled(); modal.closeModal(); }}>완료 후 닫기</button>
    <button onClick={modal.openLoginModal}>새 로그인</button></>;
}
it('완료 표시는 모달 닫기 후 유지하고 다음 로그인에서 초기화한다', () => {
  render(<AuthModalProvider><CompletionProbe /></AuthModalProvider>);
  fireEvent.click(screen.getByRole('button', { name: '완료 후 닫기' })); expect(screen.getByTestId('handled').textContent).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '새 로그인' })); expect(screen.getByTestId('handled').textContent).toBe('false');
});
