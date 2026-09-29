/**
 * WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1
 *
 * `/register` 는 비로그인 전용 진입이다.
 *   - 비로그인      → 가입(= Google 로그인) 모달을 열고 홈으로
 *   - 로그인        → 모달 없이 홈으로 (종전: 모달이 다시 열리는 루프)
 *   - 세션 복구 중  → 판정 보류 (모달 X · 이동 X)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const authState = { isAuthenticated: false, isLoading: false };
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authState }));

const openRegisterModal = vi.fn();
vi.mock('../../../contexts/LoginModalContext', () => ({ useLoginModal: () => ({ openRegisterModal }) }));

import { RegisterRedirect } from '../RegisterRedirect';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterRedirect />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterRedirect', () => {
  beforeEach(() => openRegisterModal.mockClear());
  afterEach(() => cleanup());

  it('비로그인 → 가입(로그인) 모달을 열고 홈으로 간다', () => {
    Object.assign(authState, { isAuthenticated: false, isLoading: false });
    mount();
    expect(openRegisterModal).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home')).toBeTruthy();
  });

  it('로그인 사용자 → 모달을 열지 않고 홈으로 간다', () => {
    Object.assign(authState, { isAuthenticated: true, isLoading: false });
    mount();
    expect(openRegisterModal).not.toHaveBeenCalled();
    expect(screen.getByTestId('home')).toBeTruthy();
  });

  it('세션 복구 중 → 모달도 이동도 하지 않는다 (복구 전 비로그인 오판 방지)', () => {
    Object.assign(authState, { isAuthenticated: false, isLoading: true });
    mount();
    expect(openRegisterModal).not.toHaveBeenCalled();
    expect(screen.queryByTestId('home')).toBeNull();
  });
});
