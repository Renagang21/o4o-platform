/**
 * O4O 홈 복귀 — WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1 §10-2
 *
 * 보증: 클릭 1회당 발급 1회 · 실패 후 재활성·오류·재시도 · 늦은 응답 무시 · bfcache 복원 후 busy 해제 ·
 * 대표 홈 /handoff 주소로만 현재 탭 이동 · O4O 홈은 logout·토큰 삭제를 호출하지 않는다.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  O4OHomeButton,
  O4O_HOME_URL,
  O4O_HOME_LABEL,
  O4O_LOGOUT_LABEL,
  REPRESENTATIVE_ENTRY_SERVICE_KEY,
  __resetO4OHomeReturnForTest,
} from '../useO4OHomeReturn';

const TARGET = 'https://neture.co.kr/handoff?token=11111111-2222-4333-8444-555555555555&returnTo=%2F';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const ok = (url = TARGET) => ({ data: { success: true, data: { targetUrl: url } } });
const httpError = (status: number, code?: string) => Object.assign(new Error('http'), { response: { status, data: { code } } });
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

let navigate: ReturnType<typeof vi.fn>;
beforeEach(() => {
  __resetO4OHomeReturnForTest();
  navigate = vi.fn();
  localStorage.setItem('o4o_accessToken', 'present');
  localStorage.setItem('o4o_refreshToken', 'present');
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('상수 계약', () => {
  it("대표 진입 key = 'neture' · 홈 = https://neture.co.kr/ · 라벨 = O4O 홈 / O4O 로그아웃", () => {
    expect(REPRESENTATIVE_ENTRY_SERVICE_KEY).toBe('neture');
    expect(O4O_HOME_URL).toBe('https://neture.co.kr/');
    expect(O4O_HOME_LABEL).toBe('O4O 홈');
    expect(O4O_LOGOUT_LABEL).toBe('O4O 로그아웃');
  });
});

describe('O4OHomeButton', () => {
  it('로그인 상태: handoff 1회 발급(target=neture, returnPath=/) → 발급 주소로 현재 탭 이동 · 토큰/logout 무접촉', async () => {
    const post = vi.fn().mockResolvedValue(ok());
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'neture', returnPath: '/' });
    expect(navigate).toHaveBeenCalledWith(TARGET);
    // O4O 홈은 로그아웃이 아니다 — 저장 토큰 그대로, logout endpoint 호출 0
    expect(localStorage.getItem('o4o_accessToken')).toBe('present');
    expect(localStorage.getItem('o4o_refreshToken')).toBe('present');
    expect(post.mock.calls.map((c) => c[0])).not.toContain('/auth/logout');
  });

  it('비로그인: 발급 없이 대표 홈으로 이동', async () => {
    const post = vi.fn();
    render(<O4OHomeButton api={{ post }} isAuthenticated={false} navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(post).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(O4O_HOME_URL);
  });

  it('중복 클릭 · 데스크톱/모바일 두 버튼 동시 클릭 → 발급 1회 · 진행 중 disabled + 진행 문구', async () => {
    const d = deferred<ReturnType<typeof ok>>();
    const post = vi.fn().mockReturnValue(d.promise);
    render(
      <>
        <O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />
        <O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />
      </>,
    );
    const [desktop, mobile] = screen.getAllByTestId('o4o-home-button');
    fireEvent.click(desktop);
    fireEvent.click(desktop);
    fireEvent.click(mobile);
    expect(post).toHaveBeenCalledTimes(1);
    expect((desktop as HTMLButtonElement).disabled).toBe(true);
    expect((mobile as HTMLButtonElement).disabled).toBe(true);
    expect(desktop.textContent).toBe('O4O 홈으로 이동 중…');
    d.resolve(ok());
    await flush();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('서버 오류 → 한국어 오류 · 버튼 재활성 · 재시도 시 다시 1회 발급', async () => {
    const post = vi.fn().mockRejectedValueOnce(httpError(500, 'HANDOFF_GENERATION_FAILED')).mockResolvedValueOnce(ok());
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('O4O 홈으로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect((screen.getByTestId('o4o-home-button') as HTMLButtonElement).disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(post).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(TARGET);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('네트워크 오류(response 없음)도 "미가입"이 아니라 일반 이동 실패로 안내', async () => {
    const post = vi.fn().mockRejectedValue(new Error('Network Error'));
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(screen.getByRole('alert').textContent).toContain('O4O 홈으로 이동하지 못했습니다');
    expect(screen.getByRole('alert').textContent).not.toMatch(/가입/);
  });

  it.each([['HANDOFF_SESSION_REVOKED'], ['AUTH_REQUIRED'], [undefined]])(
    '401(%s) — 세션이 이미 끝남 → 로그인된 척 없이 대표 홈으로만 이동',
    async (code) => {
      const post = vi.fn().mockRejectedValue(httpError(401, code));
      render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
      fireEvent.click(screen.getByTestId('o4o-home-button'));
      await flush();
      expect(navigate).toHaveBeenCalledWith(O4O_HOME_URL);
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('403 ACCOUNT_NOT_ACTIVE → 계정 상태 안내 · 이동 0', async () => {
    const post = vi.fn().mockRejectedValue(httpError(403, 'ACCOUNT_NOT_ACTIVE'));
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('이용할 수 없는 계정 상태라 O4O 홈으로 이동할 수 없습니다.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['https://evil.test/handoff?token=x'],
    ['https://study.neture.co.kr/handoff?token=x'],
    ['http://neture.co.kr/handoff?token=x'],
    ['https://neture.co.kr/admin'],
    [''],
  ])('예상 밖 발급 주소(%s) 로는 이동하지 않는다', async (url) => {
    const post = vi.fn().mockResolvedValue(ok(url));
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await flush();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('뒤로가기(bfcache) 복원 → busy 해제 · 복원 전에 시작된 늦은 응답은 이동·오류 표시 모두 무시', async () => {
    const late = deferred<ReturnType<typeof ok>>();
    const post = vi.fn().mockReturnValueOnce(late.promise);
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    expect((screen.getByTestId('o4o-home-button') as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      const ev = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(ev, 'persisted', { value: true });
      window.dispatchEvent(ev);
    });
    expect((screen.getByTestId('o4o-home-button') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId('o4o-home-button').textContent).toBe('O4O 홈');

    late.resolve(ok());
    await flush();
    expect(navigate).not.toHaveBeenCalled();

    // 늦은 실패도 오류를 덮어쓰지 않는다
    const lateFail = deferred<ReturnType<typeof ok>>();
    post.mockReturnValueOnce(lateFail.promise);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await act(async () => {
      const ev = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(ev, 'persisted', { value: true });
      window.dispatchEvent(ev);
    });
    lateFail.reject(httpError(500));
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('최초 로드(pageshow persisted=false) 는 진행 중 상태를 건드리지 않는다', async () => {
    const d = deferred<ReturnType<typeof ok>>();
    const post = vi.fn().mockReturnValue(d.promise);
    render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    await act(async () => {
      const ev = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(ev, 'persisted', { value: false });
      window.dispatchEvent(ev);
    });
    expect((screen.getByTestId('o4o-home-button') as HTMLButtonElement).disabled).toBe(true);
    d.resolve(ok());
    await flush();
    expect(navigate).toHaveBeenCalledWith(TARGET);
  });

  it('버튼이 사라져도(드롭다운 닫힘) 진행 중 이동은 취소되지 않는다', async () => {
    const d = deferred<ReturnType<typeof ok>>();
    const post = vi.fn().mockReturnValue(d.promise);
    const { unmount } = render(<O4OHomeButton api={{ post }} isAuthenticated navigate={navigate} />);
    fireEvent.click(screen.getByTestId('o4o-home-button'));
    unmount();
    d.resolve(ok());
    await flush();
    expect(navigate).toHaveBeenCalledWith(TARGET);
  });
});
