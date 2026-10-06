/**
 * WO-O4O-LECTURE-HANDOFF-NONMEMBER-UX-V1 — `/service-entry/:serviceKey` 미가입 사용자 화면
 *
 *   - 로그인은 성공했지만 handoff 가 대상 서비스 membership 으로 거절되면(`HANDOFF_TARGET_*`) 일반 오류가 아니라
 *     "로그인 완료 + 서비스 이용 자격 필요" 화면을 보인다.
 *   - 원래 경로가 공개 경로(/courses …)면 그 경로로, 아니면 공개 강의 목록으로 돌려보낸다. 문의 경로를 준다.
 *   - 그 밖의 오류는 기존 일반 오류 화면, 가입 사용자는 기존대로 handoff URL 로 이동한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const h = vi.hoisted(() => {
  class ServiceEntryError extends Error {
    constructor(message: string, public readonly code?: string) {
      super(message);
    }
  }
  return {
    ServiceEntryError,
    resolveServiceEntryUrl: vi.fn(),
    openLoginModal: vi.fn(),
    auth: { isAuthenticated: true, isLoading: false },
  };
});
vi.mock('../../../lib/home-entry', () => ({
  resolveServiceEntryUrl: h.resolveServiceEntryUrl,
  ServiceEntryError: h.ServiceEntryError,
}));
vi.mock('../../../contexts', () => ({
  useAuth: () => h.auth,
  useLoginModal: () => ({ openLoginModal: h.openLoginModal }),
}));

import ServiceEntryPage from '../ServiceEntryPage';

const assign = vi.fn();

function mount(entry: string) {
  // window.location 은 assign 확인용으로 바꿔 두므로 라우터는 메모리에서 시작한다
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/service-entry/:serviceKey" element={<ServiceEntryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.resolveServiceEntryUrl.mockReset();
  h.openLoginModal.mockReset();
  h.auth.isAuthenticated = true;
  h.auth.isLoading = false;
  assign.mockReset();
  vi.stubGlobal('location', { ...window.location, assign });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ServiceEntryPage — 미가입 사용자', () => {
  it.each(['HANDOFF_TARGET_NO_MEMBERSHIP', 'HANDOFF_TARGET_NOT_ACTIVE', 'HANDOFF_TARGET_WITHDRAWN'])(
    '%s → 로그인 완료 + 이용 자격 필요 화면 (일반 오류 아님)',
    async (code) => {
      h.resolveServiceEntryUrl.mockRejectedValue(new h.ServiceEntryError('거절', code));
      mount('/service-entry/lecture?returnPath=%2Fmy%2Fenrollments');
      const box = await screen.findByTestId('service-entry-not-member');
      expect(box.getAttribute('data-code')).toBe(code);
      expect(box.textContent).toContain('로그인은 정상적으로 완료되었습니다');
      expect(screen.queryByTestId('service-entry-error')).toBeNull();
      // 보호 경로(/my/*)는 돌려보내지 않고 공개 목록으로
      const browse = screen.getByTestId('service-entry-browse');
      expect(browse.getAttribute('href')).toBe('https://study.neture.co.kr/courses');
      expect(browse.textContent).toBe('공개 강의 둘러보기');
      expect(screen.getByTestId('service-entry-inquiry').getAttribute('href')).toBe('/contact');
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it('원래 경로가 공개 강의 경로면 그 화면으로 돌려보낸다', async () => {
    h.resolveServiceEntryUrl.mockRejectedValue(new h.ServiceEntryError('거절', 'HANDOFF_TARGET_NO_MEMBERSHIP'));
    mount(`/service-entry/lecture?returnPath=${encodeURIComponent('/courses/abc?tab=intro')}`);
    const browse = await screen.findByTestId('service-entry-browse');
    expect(browse.getAttribute('href')).toBe('https://study.neture.co.kr/courses/abc?tab=intro');
    expect(browse.textContent).toBe('보던 강의 화면으로 돌아가기');
    expect(h.resolveServiceEntryUrl).toHaveBeenCalledWith('lecture', '/courses/abc?tab=intro');
  });

  it('공개 경로 접두사와 글자만 겹치는 경로는 공개로 보지 않는다', async () => {
    h.resolveServiceEntryUrl.mockRejectedValue(new h.ServiceEntryError('거절', 'HANDOFF_TARGET_NO_MEMBERSHIP'));
    mount(`/service-entry/lecture?returnPath=${encodeURIComponent('/coursesx/1')}`);
    const browse = await screen.findByTestId('service-entry-browse');
    expect(browse.getAttribute('href')).toBe('https://study.neture.co.kr/courses');
  });
});

describe('ServiceEntryPage — 회귀', () => {
  it('membership 이 아닌 오류는 기존 일반 오류 화면', async () => {
    h.resolveServiceEntryUrl.mockRejectedValue(new h.ServiceEntryError('로그인이 필요합니다.', 'AUTH_REQUIRED'));
    mount('/service-entry/lecture');
    const box = await screen.findByTestId('service-entry-error');
    expect(box.textContent).toContain('로그인이 필요합니다.');
    expect(screen.queryByTestId('service-entry-not-member')).toBeNull();
  });

  it('가입 사용자는 handoff URL 로 그대로 이동한다', async () => {
    h.resolveServiceEntryUrl.mockResolvedValue('https://study.neture.co.kr/handoff?token=t&returnTo=%2Fmy');
    mount('/service-entry/lecture?returnPath=%2Fmy');
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://study.neture.co.kr/handoff?token=t&returnTo=%2Fmy'));
    expect(h.resolveServiceEntryUrl).toHaveBeenCalledWith('lecture', '/my');
    expect(screen.queryByTestId('service-entry-not-member')).toBeNull();
  });

  it('로그인 전에는 handoff 를 부르지 않고 로그인 모달을 연다', async () => {
    h.auth.isAuthenticated = false;
    mount('/service-entry/lecture?returnPath=%2Fcourses');
    await waitFor(() => expect(h.openLoginModal).toHaveBeenCalledWith('/service-entry/lecture?returnPath=%2Fcourses'));
    expect(h.resolveServiceEntryUrl).not.toHaveBeenCalled();
    expect(screen.getByTestId('service-entry-login')).toBeTruthy();
  });
});
