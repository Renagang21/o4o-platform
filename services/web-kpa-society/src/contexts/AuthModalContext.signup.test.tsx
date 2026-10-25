import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthModalProvider, useAuthModal } from './AuthModalContext';

afterEach(() => { vi.unstubAllGlobals(); cleanup(); });

it('회원가입 진입은 로그인 모달 대신 공통 가입 화면으로 이동한다', () => {
  const { result } = renderHook(() => useAuthModal(), { wrapper: AuthModalProvider });
  const assign = vi.fn();
  vi.stubGlobal('window', { location: { assign } });
  try {
    result.current.openRegisterModal();
  } finally {
    vi.unstubAllGlobals();
  }
  expect(assign).toHaveBeenCalledWith('https://neture.co.kr/signup');
  expect(result.current.isLoginModalOpen).toBe(false);
});
