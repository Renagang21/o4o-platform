import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LoginModalProvider, useLoginModal } from '../../../contexts/LoginModalContext';
import { LoginRedirect } from '../LoginRedirect';
import SupplierServiceEntry from '../../../pages/SupplierServiceEntry';
import MarketTrialHubPage from '../../../pages/market-trial/MarketTrialHubPage';

const state = vi.hoisted(() => ({ profile: 'supplier', isAuthenticated: false, isLoading: false }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => state }));
vi.mock('../../../lib/hostProfile', () => ({ get CURRENT_HOST_PROFILE() { return state.profile; } }));

vi.mock('../ServiceApplyPanel', () => ({ ServiceApplyPanel: () => <div>신청 상태</div> }));
vi.mock('../../../api/trial', () => ({ getTrials: vi.fn(), getMyParticipations: vi.fn() }));

function Home() {
  if (state.profile === 'supplier') return <SupplierServiceEntry />;
  if (state.profile === 'funding') return <MarketTrialHubPage />;
  return <div>공개 홈</div>;
}
function Probe() {
  const modal = useLoginModal();
  const location = useLocation();
  return <><output data-testid="path">{location.pathname}{location.hash}</output>
    <output data-testid="return">{modal.loginReturnUrl}</output>
    {modal.isLoginModalOpen && <button onClick={modal.closeModal}>모달 닫기</button>}</>;
}
function mount(entry = '/login?returnUrl=%2Fworkspace') {
  return render(<MemoryRouter initialEntries={[entry]}><LoginModalProvider>
    <Routes><Route path="/login" element={<LoginRedirect />} /><Route path="/" element={<Home />} />
      <Route path="/workspace" element={<div>업무 화면</div>} /></Routes><Probe />
  </LoginModalProvider></MemoryRouter>);
}
afterEach(() => { cleanup(); Object.assign(state, { profile: 'supplier', isAuthenticated: false, isLoading: false }); });
describe('로그인 진입과 보호 홈', () => {
  it.each(['supplier', 'funding'])('%s 홈에서 로그인으로 이동해 안정적으로 머문다', profile => {
    state.profile = profile; mount('/');
    expect(screen.getByTestId('path').textContent).toBe('/login');
    expect(screen.getByText('모달 닫기')).toBeTruthy();
    fireEvent.click(screen.getByText('모달 닫기'));
    expect(screen.queryByText('모달 닫기')).toBeNull();
    fireEvent.click(screen.getByText('로그인하기'));
    expect(screen.getByText('모달 닫기')).toBeTruthy();
    expect(screen.getByTestId('return').textContent).toBe('/');
  });
  it.each(['main', 'community'])('%s 공개 홈 진입을 유지한다', profile => {
    state.profile = profile; mount(); expect(screen.getByText('공개 홈')).toBeTruthy();
    expect(screen.getByTestId('return').textContent).toBe('/workspace');
  });
  it('복구 중에는 모달과 경로 이동을 보류한다', () => {
    state.isLoading = true; mount(); expect(screen.queryByText('모달 닫기')).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe('/login');
  });
  it('인증된 사용자는 복귀 경로로 이동한다', () => {
    state.isAuthenticated = true; mount(); expect(screen.getByText('업무 화면')).toBeTruthy();
    expect(screen.queryByText('모달 닫기')).toBeNull();
  });
  it('외부 복귀 URL을 모달에 전달하지 않는다', () => {
    mount('/login?returnUrl=https%3A%2F%2Fexample.com');
    expect(screen.getByTestId('return').textContent).toBe('');
  });
  it.each(['supplier', 'funding', 'main', 'community'])('%s 카카오 callback fragment를 소비 전에 보존한다', profile => {
    state.profile = profile; mount('/login#social_kind=kakao-login&social_status=cancelled');
    expect(screen.getByTestId('path').textContent).toContain('#social_kind=kakao-login&social_status=cancelled');
  });
});
