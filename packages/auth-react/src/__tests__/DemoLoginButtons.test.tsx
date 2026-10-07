import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DemoLoginButtons } from '../DemoLoginButtons';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
afterEach(cleanup);
describe('public demo authentication', () => {
  it.each(PUBLIC_DEMO_ACCOUNTS)('ordinary login for $type', async (account) => {
    const user = { id: 'demo' }; const login = vi.fn(async () => ({ success: true, user })); const success = vi.fn();
    render(<DemoLoginButtons loginWithEmail={login} onSuccess={success} />);
    fireEvent.click(screen.getByRole('button', { name: account.label }));
    await waitFor(() => expect(success).toHaveBeenCalledWith(user));
    expect(login).toHaveBeenCalledWith(account.email, account.password);
  });
  it('failure keeps the visitor on login and unlocks retry', async () => {
    const success = vi.fn(); const login = vi.fn(async () => ({ success: false, error: '사용할 수 없는 계정입니다.' }));
    render(<DemoLoginButtons loginWithEmail={login} onSuccess={success} />);
    fireEvent.click(screen.getByRole('button', { name: PUBLIC_DEMO_ACCOUNTS[0].label }));
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(success).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: PUBLIC_DEMO_ACCOUNTS[1].label }) as HTMLButtonElement).disabled).toBe(false);
  });
});
