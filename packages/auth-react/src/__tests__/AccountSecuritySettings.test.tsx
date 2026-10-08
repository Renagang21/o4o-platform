import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountSecuritySettings } from '../../../account-ui/src/components/AccountSecuritySettings';

afterEach(cleanup);

describe('account security logout policy', () => {
  it('offers ordinary logout without an all-device action or a Google-only claim', async () => {
    const logout = vi.fn(async () => undefined);
    render(<AccountSecuritySettings onLogout={logout} />);
    expect(screen.queryByText(/모든 기기|다른 기기|Google 계정/)).toBeNull();
    expect(screen.getByText('O4O 계정')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it('disables repeated clicks while logout is pending', async () => {
    let finish!: () => void;
    const logout = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<AccountSecuritySettings onLogout={logout} />);
    const button = screen.getByRole('button', { name: '로그아웃' });
    fireEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(logout).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });

  it('reports a failure and allows retry', async () => {
    const error = vi.fn();
    const logout = vi.fn(async () => { throw new Error('offline'); });
    render(<AccountSecuritySettings onLogout={logout} notify={{ success: vi.fn(), error }} />);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
    expect((screen.getByRole('button', { name: '로그아웃' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('omits account actions when logout is unavailable', () => {
    render(<AccountSecuritySettings />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('계정 관리')).toBeNull();
  });
});
