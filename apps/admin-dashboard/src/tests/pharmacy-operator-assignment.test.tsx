import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import OperatorsPage from '../pages/operators/OperatorsPage';
import { parseRole } from '../lib/rbac-catalog';
vi.mock('@o4o/auth-client', () => ({ authClient: { api: {
  get: vi.fn(async (url: string) => ({ data: url.includes('/candidates')
    ? { success: true, data: { candidates: [{ userId: 'synthetic-user', name: 'Test Operator', email: 'operator@example.invalid', hasGoogleLink: true }] } }
    : { success: true, users: [] } })),
  post: vi.fn(async () => ({ data: { success: true, data: { membershipPolicy: 'CREATED' } } })), put: vi.fn(), delete: vi.fn(),
} } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('four collaborator consent invitations', () => {
  it.each(['pharmacy', 'carepharm', 'megapharm', 'pharmcoop'])('invites %s without a global Neture role or fabricated membership key', async key => {
    const view = render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '서비스 담당자 지정' }));
    for (const target of ['pharmacy', 'carepharm', 'megapharm', 'pharmcoop']) {
      expect(view.container.querySelector(`input[name="target-service"][value="${target}"]`)).toBeTruthy();
    }
    fireEvent.click(view.container.querySelector(`input[name="target-service"][value="${key}"]`)!);
    expect(screen.getByRole('radio', { name: new RegExp(`neture:${key}_admin`) })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`neture:${key}_operator`) }));
    fireEvent.change(screen.getByPlaceholderText(/이메일 또는 이름/), { target: { value: 'operator' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Test Operator/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 메일 보내기' }));
    await waitFor(() => expect(authClient.api.post).toHaveBeenCalledWith('/admin/service-operator-invitations', {
      targetUserId: 'synthetic-user', serviceKey: 'neture', role: `neture:${key}_operator`,
    }));
    const parsed = parseRole(`neture:${key}_operator`);
    expect(parsed).toMatchObject({ raw: `neture:${key}_operator`, serviceKey: key, roleKey: 'operator' });
  });
});
