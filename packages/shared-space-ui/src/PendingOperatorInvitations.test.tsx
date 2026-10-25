import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PendingOperatorInvitations } from './PendingOperatorInvitations';
afterEach(cleanup);
const pending = [{ id: 'invitation', invited_email: 'fixture@example.invalid', role: 'funding:operator', expires_at: '2026-10-30T00:00:00Z' }];
it('lists only the selected scope and refreshes after cancellation without granting a role', async () => {
  const client = { get: vi.fn().mockResolvedValueOnce({ data: { data: pending } }).mockResolvedValue({ data: { data: [] } }), post: vi.fn().mockResolvedValue({ data: {} }) };
  render(<PendingOperatorInvitations client={client} kind="service" scope="funding" />);
  await screen.findByText('fixture@example.invalid');
  expect(client.get).toHaveBeenCalledWith('/service-operator-invitations/scopes/service/funding?role=operator');
  fireEvent.click(screen.getByRole('button', { name: '초대 취소' }));
  await screen.findByText('대기 중인 초대가 없습니다.');
  expect(client.post.mock.calls).toEqual([['/service-operator-invitations/manage/invitation/cancel', {}]]);
});
it('locks duplicate resend clicks and displays failed delivery for an explicit retry', async () => {
  let fail!: (e: Error) => void;
  const client = { get: vi.fn().mockResolvedValue({ data: { data: pending } }), post: vi.fn().mockImplementation(() => new Promise((_r, reject) => { fail = reject; })) };
  render(<PendingOperatorInvitations client={client} kind="branch" scope="branch" />);
  const resend = await screen.findByRole('button', { name: '재발송' });
  fireEvent.click(resend); fireEvent.click(resend);
  expect(client.post).toHaveBeenCalledTimes(1);
  await act(async () => fail(new Error('Synthetic SMTP failure')));
  await screen.findByRole('alert');
  await waitFor(() => expect((resend as HTMLButtonElement).disabled).toBe(false));
});
it('discards a stale list when the account or scope changes', async () => {
  let resolve!: (v: any) => void;
  const client = { get: vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue({ data: { data: [] } }), post: vi.fn() };
  const view = render(<PendingOperatorInvitations client={client} kind="cooperative" scope="old" />);
  view.rerender(<PendingOperatorInvitations client={client} kind="cooperative" scope="new" />);
  await screen.findByText('대기 중인 초대가 없습니다.');
  await act(async () => resolve({ data: { data: pending } }));
  expect(screen.queryByText('fixture@example.invalid')).toBeNull();
});
