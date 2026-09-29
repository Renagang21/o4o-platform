/**
 * WO-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1 — 로그인 모달 문구
 *   제목은 호스트와 무관하게 「O4O 로그인」(계정은 Google 하나).
 *   보조 문구는 hostProfile 로 호스트별: 대표 호스트 = O4O 서비스 통합 로그인.
 *   종전 「Neture 로그인 · 공급자 연결 서비스」 는 쓰지 않는다. Google 인증 흐름은 그대로(GoogleContinue).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@o4o/auth-react', () => ({ GoogleContinue: () => <div data-testid="google-continue" /> }));
vi.mock('../../contexts', () => ({
  useAuth: () => ({ loginWithGoogle: vi.fn(), signupWithGoogle: vi.fn(), getGoogleAuthConfig: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock('../../lib/hostProfile');
});

async function mountOn(profile: 'main' | 'supplier' | 'funding' | 'community') {
  vi.doMock('../../lib/hostProfile', () => ({ CURRENT_HOST_PROFILE: profile }));
  const { default: LoginModal } = await import('../LoginModal');
  render(
    <MemoryRouter>
      <LoginModal isOpen onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe('LoginModal 제목 · 보조 문구', () => {
  it.each([
    ['main', 'O4O 서비스 통합 로그인'],
    ['supplier', '공급자 서비스'],
    ['funding', '유통참여형 펀딩'],
    ['community', '커뮤니티'],
  ] as const)('%s 호스트 → 「O4O 로그인」 + %s', async (profile, subtitle) => {
    await mountOn(profile);
    expect(screen.getByRole('heading', { name: 'O4O 로그인' })).toBeTruthy();
    expect(screen.getByText(subtitle)).toBeTruthy();
    expect(screen.queryByText('공급자 연결 서비스')).toBeNull();
    expect(screen.getByTestId('google-continue')).toBeTruthy();
  });
});
