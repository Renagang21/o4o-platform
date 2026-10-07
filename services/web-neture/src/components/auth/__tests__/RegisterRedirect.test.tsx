/**
 * WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1 (로그인 상태 판정)
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 (가입 진입점 통일)
 *
 * `/register` 는 비로그인 전용 진입이다.
 *   - 비로그인      → **가입 화면 `/signup`** (이메일 · Google 두 수단을 함께 제공하는 정본 화면)
 *   - 로그인        → 홈 (가입 화면을 다시 보여 주지 않는다 = 루프 방지)
 *   - 세션 복구 중  → 판정 보류 (이동 X)
 *
 * 종전에는 홈으로 보내며 로그인 모달을 열었다. 그 구조는 가입 수단이 Google 하나일 때의 것이고,
 * 지금은 모달 안의 링크를 거쳐야 이메일 가입에 닿아 **진입점이 갈라진다.**
 * 그래서 이 테스트는 "모달을 연다" 가 아니라 "가입 화면으로 간다" 를 고정한다.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const authState = { isAuthenticated: false, isLoading: false };
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authState }));

import { RegisterRedirect } from '../RegisterRedirect';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterRedirect />} />
        <Route path="/signup" element={<div data-testid="signup" />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterRedirect', () => {
  afterEach(() => cleanup());

  it('비로그인 → 가입 화면(/signup)으로 간다', () => {
    Object.assign(authState, { isAuthenticated: false, isLoading: false });
    mount();
    expect(screen.getByTestId('signup')).toBeTruthy();
    expect(screen.queryByTestId('home')).toBeNull();
  });

  it('로그인 사용자 → 홈으로 간다 (가입 화면 재노출 없음)', () => {
    Object.assign(authState, { isAuthenticated: true, isLoading: false });
    mount();
    expect(screen.getByTestId('home')).toBeTruthy();
    expect(screen.queryByTestId('signup')).toBeNull();
  });

  it('세션 복구 중 → 이동하지 않는다 (복구 전 비로그인 오판 방지)', () => {
    Object.assign(authState, { isAuthenticated: false, isLoading: true });
    mount();
    expect(screen.queryByTestId('signup')).toBeNull();
    expect(screen.queryByTestId('home')).toBeNull();
  });

  it('로그인 모달에 의존하지 않는다 — LoginModalContext 를 쓰지 않는다', async () => {
    // 모달 컨텍스트를 mock 하지 않았는데도 위 3케이스가 통과한다는 것이 곧 의존 0의 증거다.
    // 소스에서도 직접 확인한다(가입 진입점이 다시 모달로 돌아가면 실패).
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'RegisterRedirect.tsx'), 'utf-8');
    expect(src).not.toContain('useLoginModal');
    expect(src).toContain("'/signup'");
  });
});
