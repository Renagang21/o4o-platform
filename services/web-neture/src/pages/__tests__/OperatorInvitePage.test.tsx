import { StrictMode } from 'react';
import { clearOperatorInvitationEntry, operatorInvitationReturnPath } from '../../lib/operatorInvitationReturn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import OperatorInvitePage from '../OperatorInvitePage';
const h = vi.hoisted(() => ({
  post: vi.fn(),
  open: vi.fn(),
  refresh: vi.fn(async () => {}),
  auth: {
    user: { id: 'u1', email: 'op@example.com', name: 'Test operator' },
    isAuthenticated: true,
    isLoading: false,
  },
}));
vi.mock('../../contexts', () => ({
  useAuth: () => ({ ...h.auth, refreshAuth: h.refresh }),
  useLoginModal: () => ({ openLoginModal: h.open }),
}));
vi.mock('../../lib/apiClient', () => ({ api: { post: h.post } }));
const TOKEN = 'a'.repeat(64);
beforeEach(() => {
  vi.clearAllMocks();
  clearOperatorInvitationEntry();
  window.history.replaceState(null, '', '/operator-invite#token=' + TOKEN);
  h.auth.isAuthenticated = true;
  h.refresh.mockResolvedValue(undefined);
  h.post.mockImplementation(async (path: string) => ({
    data: {
      data: {
        serviceKey: 'lecture',
        role: 'lecture:operator',
        purpose: 'assignment',
      },
    },
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); clearOperatorInvitationEntry(); });
describe('operator mail acceptance', () => {
  it('removes the secret from the URL and never accepts on page load or preview', async () => {
    render(<OperatorInvitePage />);
    await waitFor(() =>
      expect(screen.getByText(/lecture · 서비스 운영자/)).toBeTruthy(),
    );
    expect(window.location.hash).toBe('');
    expect(h.post.mock.calls.every(([path]) => path.endsWith('/inspect'))).toBe(
      true,
    );
    fireEvent.click(
      screen.getByRole('button', { name: '이 계정으로 확인·수락' }),
    );
    await waitFor(() =>
      expect(h.post).toHaveBeenCalledWith(
        '/service-operator-invitations/accept',
        { token: TOKEN },
      ),
    );
    await waitFor(() =>
      expect(sessionStorage.getItem('o4o_operator_invite')).toBeNull(),
    );
  });
  it('preserves the link through login/signup without placing it in the login return URL', () => {
    h.auth.isAuthenticated = false;
    render(<OperatorInvitePage />);
    fireEvent.click(screen.getByRole('button', { name: '로그인 / 가입' }));
    expect(h.open).toHaveBeenCalledWith('/operator-invite');
    expect(sessionStorage.getItem('o4o_operator_invite')).toBe(TOKEN);
    expect(h.post).not.toHaveBeenCalled();
  });
  it('does not replace an invalid incoming link with a previous stored invitation', () => {
    sessionStorage.setItem('o4o_operator_invite', TOKEN);
    window.history.replaceState(null, '', '/operator-invite#token=bad');
    render(<OperatorInvitePage />);
    expect(screen.getByText('메일의 초대 링크를 열어 주세요.')).toBeTruthy();
    expect(h.post).not.toHaveBeenCalled();
  });
  it('does not allow acceptance when the logged-in account differs from the bound target', async () => {
    h.post.mockRejectedValue({
      response: { data: { code: 'INVITATION_ACCOUNT_MISMATCH' } },
    });
    render(<OperatorInvitePage />);
    await waitFor(() =>
      expect(screen.getByText(/지정된 계정과 다릅니다/)).toBeTruthy(),
    );
    expect(
      (
        screen.getByRole('button', {
          name: '이 계정으로 확인·수락',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(h.post.mock.calls.every(([path]) => path.endsWith('/inspect'))).toBe(
      true,
    );
  });
  it('keeps a failed acceptance retryable without discarding its mail proof', async () => {
    h.post.mockImplementation(async (path: string) => {
      if (path.endsWith('/accept')) throw new Error('offline');
      return {
        data: {
          data: {
            serviceKey: 'lecture',
            role: 'lecture:operator',
            purpose: 'assignment',
          },
        },
      };
    });
    render(<OperatorInvitePage />);
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: '이 계정으로 확인·수락',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(
      screen.getByRole('button', { name: '이 계정으로 확인·수락' }),
    );
    await waitFor(() =>
      expect(screen.getByText(/수락하지 못했습니다/)).toBeTruthy(),
    );
    expect(sessionStorage.getItem('o4o_operator_invite')).toBe(TOKEN);
  });
});


it.each([['INVALID_OR_EXPIRED_INVITATION', false], ['INVITATION_ACCOUNT_MISMATCH', true], ['TEMPORARY_FAILURE', true]])('clears only terminal inspection failures: %s', async (code, retained) => {
  h.post.mockRejectedValue({ response: { data: { code } } });
  render(<OperatorInvitePage />);
  await screen.findByText(code === 'INVITATION_ACCOUNT_MISMATCH' ? '지정된 계정과 다릅니다. 지정된 계정으로 다시 로그인하세요.' : '유효한 초대를 확인하지 못했습니다. 이미 처리되었거나 만료·취소된 링크인지 확인하세요.');
  expect(sessionStorage.getItem('o4o_operator_invite')).toBe(retained ? TOKEN : null);
  expect(h.post.mock.calls.every(([path]) => path.endsWith('/inspect'))).toBe(true);
});


it.each([['INVALID_OR_EXPIRED_INVITATION', false], ['INVITATION_ACCOUNT_MISMATCH', true], ['TEMPORARY_FAILURE', true]])('clears only terminal acceptance failures: %s', async (code, retained) => {
  h.post.mockImplementation(async (path: string) => {
    if (path.endsWith('/accept')) throw Object.assign(new Error('Synthetic acceptance failure'), { response: { data: { code } } });
    return { data: { data: { serviceKey: 'lecture', role: 'lecture:operator', purpose: 'assignment' } } };
  });
  render(<OperatorInvitePage />);
  await screen.findByText(/lecture · 서비스 운영자/);
  fireEvent.click(screen.getByRole('button', { name: '이 계정으로 확인·수락' }));
  await screen.findByText(code === 'INVITATION_ACCOUNT_MISMATCH' ? '초대에 지정된 계정과 다릅니다. 지정된 계정으로 로그인하세요.' : '수락하지 못했습니다. 링크 만료·취소 또는 권한 회수 여부를 관리자에게 확인하세요.');
  expect(sessionStorage.getItem('o4o_operator_invite')).toBe(retained ? TOKEN : null);
  expect(operatorInvitationReturnPath()).toBe(retained ? '/operator-invite' : '/');
});
it('keeps a valid incoming token in memory with storage blocked, including StrictMode, and scrubs the fragment', async () => {
  for (const method of ['getItem','setItem','removeItem'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('Storage unavailable'); });
  render(<StrictMode><OperatorInvitePage /></StrictMode>);
  await screen.findByText(/lecture · 서비스 운영자/);
  expect(window.location.hash).toBe('');
  expect(h.post).toHaveBeenCalledWith('/service-operator-invitations/inspect', { token: TOKEN });
  fireEvent.click(screen.getByRole('button', { name: '이 계정으로 확인·수락' }));
  await screen.findByText(/확인·수락을 완료했습니다/);
  expect(operatorInvitationReturnPath()).toBe('/');
});
