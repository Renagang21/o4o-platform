import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PasswordSecuritySettings } from '../PasswordSecuritySettings';
afterEach(cleanup);
function setup(hasPassword = true, canManage = true) {
  const client = { getPasswordStatus: vi.fn(async () => ({ hasPassword, canManage })), setPassword: vi.fn(async () => {}) };
  const ended = vi.fn(); render(<PasswordSecuritySettings client={client} onSessionEnded={ended} />); return { client, ended };
}
async function fill(current?: string, confirmation = 'newFixture123!') {
  const input = await screen.findByLabelText('새 비밀번호');
  fireEvent.change(input, { target: { value: 'newFixture123!' } });
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: confirmation } });
  if (current) fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: current } });
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 저장' }));
}
describe('password security settings', () => {
  it('requires matching confirmation and current password for an existing credential', async () => {
    const { client } = setup(); await fill(undefined, 'different123!');
    expect((await screen.findByRole('alert')).textContent).toContain('일치'); expect(client.setPassword).not.toHaveBeenCalled();
    await fill(); expect(screen.getByRole('alert').textContent).toContain('현재 비밀번호');
    expect(client.setPassword).not.toHaveBeenCalled();
  });
  it('changes an existing password and exits the session only after success', async () => {
    const { client, ended } = setup(); await fill('currentFixture123!');
    await waitFor(() => expect(ended).toHaveBeenCalledTimes(1));
    expect(client.setPassword).toHaveBeenCalledWith({ currentPassword: 'currentFixture123!', newPassword: 'newFixture123!' });
    expect((screen.getByLabelText('새 비밀번호') as HTMLInputElement).value).toBe('');
  });
  it('adds the first password without requesting a nonexistent current password', async () => {
    const { client, ended } = setup(false); await fill();
    await waitFor(() => expect(ended).toHaveBeenCalled());
    expect(screen.queryByLabelText('현재 비밀번호')).toBeNull();
    expect(client.setPassword).toHaveBeenCalledWith({ newPassword: 'newFixture123!' });
  });
  it('does not show mutation fields for Demo/admin restrictions', async () => {
    const { client } = setup(true, false);
    await screen.findByText('이 계정에서는 비밀번호 설정을 변경할 수 없습니다.');
    expect(screen.queryByRole('button', { name: '비밀번호 저장' })).toBeNull(); expect(client.setPassword).not.toHaveBeenCalled();
  });
  it('failed current-password verification keeps the session and shows a clear error', async () => {
    const { client, ended } = setup(); client.setPassword.mockRejectedValueOnce({ response: { data: { code: 'CURRENT_PASSWORD_MISMATCH' } } });
    await fill('incorrectFixture123!'); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('현재 비밀번호가 올바르지'));
    expect(ended).not.toHaveBeenCalled();
  });
});
