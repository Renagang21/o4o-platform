// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemberPaidFeaturesPanel } from './MemberPaidFeaturesPanel';
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./api', () => ({ getPharmacyManagementClient: () => api }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: { success: true, data: { id: 'member', email: 'fixture@example.test', name: '합성 회원', active: false, endsAt: null } } });
  api.put.mockResolvedValue({ data: { success: true } });
});
it('looks up an exact member and saves member status rather than a store subscription', async () => {
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText('회원 이메일'), { target: { value: 'fixture@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: '회원 조회' }));
  fireEvent.click(await screen.findByLabelText('유료 자격 활성'));
  fireEvent.change(screen.getByLabelText('유료 자격 만료일'), { target: { value: '2030-01-01T09:00' } });
  fireEvent.click(screen.getByRole('button', { name: '유료 자격 저장' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/neture/admin/member-paid-entitlements/member', { active: true, endsAt: '2030-01-01T00:00:00.000Z' }));
  fireEvent.change(screen.getByLabelText('회원 이메일'), { target: { value: 'another@example.test' } });
  expect(screen.queryByRole('button', { name: '유료 자격 저장' })).toBeNull();
});
it('preserves selection after a failed write and supports retry and cancellation', async () => {
  api.put.mockRejectedValueOnce(new Error('offline'));
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText('회원 이메일'), { target: { value: 'fixture@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: '회원 조회' }));
  fireEvent.click(await screen.findByLabelText('유료 자격 활성'));
  fireEvent.click(screen.getByRole('button', { name: '유료 자격 저장' }));
  await screen.findByText('저장하지 못했습니다. 다시 시도해 주세요.');
  expect((screen.getByLabelText('유료 자격 활성') as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '유료 자격 저장' }));
  await screen.findByText('회원 유료 자격을 저장했습니다.');
  fireEvent.click(screen.getByLabelText('유료 자격 활성'));
  fireEvent.click(screen.getByRole('button', { name: '유료 자격 저장' }));
  await waitFor(() => expect(api.put).toHaveBeenLastCalledWith(expect.any(String), { active: false, endsAt: null }));
});
