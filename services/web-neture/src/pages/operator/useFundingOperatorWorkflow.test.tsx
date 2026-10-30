import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ detail: vi.fn(), participants: vi.fn(), kpi: vi.fn(), status: vi.fn(), payment: vi.fn(), reward: vi.fn() }));
vi.mock('../../api/trial', () => ({
  getOperatorTrialDetail: api.detail, getOperatorTrialParticipants: api.participants, getOperatorTrialKpi: api.kpi,
  updateTrialStatus: api.status, updateParticipantPaymentStatus: api.payment, updateParticipantRewardStatus: api.reward,
  approveTrialFirst: vi.fn(), rejectTrialFirst: vi.fn(), retryTrialForumSync: vi.fn(), exportParticipantsCSV: vi.fn(),
}));
import { useFundingOperatorWorkflow } from './useFundingOperatorWorkflow';
import { FundingBindings } from './FundingBindings';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('takes the write lock synchronously across operation types before React rerenders', async () => {
  api.detail.mockResolvedValue({ id: 'fixture' });
  api.participants.mockResolvedValue({ participants: [], summary: { totalCount: 0 } }); api.kpi.mockResolvedValue(null);
  let finish!: () => void;
  api.status.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useFundingOperatorWorkflow('fixture'), { wrapper: FundingBindings });
  await waitFor(() => expect(result.current.loading).toBe(false));
  let first!: Promise<boolean>;
  await act(async () => {
    const workflow = result.current;
    first = workflow.changeStatus('development');
    expect(await workflow.changeStatus('development')).toBe(false);
    expect(await workflow.handlePaymentStatusChange({ id: 'p' } as any, { paymentStatus: 'paid' })).toBe(false);
    expect(await workflow.handleToggleRewardStatus({ id: 'p', rewardStatus: 'pending' } as any)).toBe(false);
  });
  expect(api.status).toHaveBeenCalledTimes(1); expect(api.payment).not.toHaveBeenCalled(); expect(api.reward).not.toHaveBeenCalled();
  await act(async () => { finish(); expect(await first).toBe(true); });
  expect(result.current.pending).toBe(false);
});

it('a retained callback from an unmounted workspace cannot start a write or refresh', async () => {
  api.detail.mockResolvedValue({ id: 'fixture' }); api.participants.mockResolvedValue({ participants: [], summary: { totalCount: 0 } }); api.kpi.mockResolvedValue(null);
  const { result, unmount } = renderHook(() => useFundingOperatorWorkflow('fixture'), { wrapper: FundingBindings });
  await waitFor(() => expect(result.current.loading).toBe(false));
  const previous = result.current; unmount();
  expect(await previous.changeStatus('development')).toBe(false);
  await previous.refresh();
  expect(api.status).not.toHaveBeenCalled(); expect(api.detail).toHaveBeenCalledTimes(1);
});

it('a failed post-write detail read locks subsequent writes until read-only recovery succeeds', async () => {
  api.detail.mockResolvedValueOnce({ id: 'fixture' }).mockRejectedValueOnce(new Error('상세 조회 실패')).mockResolvedValue({ id: 'fixture' });
  api.participants.mockResolvedValue({ participants: [], summary: { totalCount: 0 } }); api.kpi.mockResolvedValue(null); api.status.mockResolvedValue({});
  const { result } = renderHook(() => useFundingOperatorWorkflow('fixture'), { wrapper: FundingBindings });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { expect(await result.current.changeStatus('development')).toBe(true); });
  expect(result.current.refreshRequired).toBe(true);
  await act(async () => { expect(await result.current.changeStatus('outcome_confirming')).toBe(false); });
  expect(api.status).toHaveBeenCalledTimes(1);
  await act(async () => { await result.current.refresh(); });
  expect(result.current.refreshRequired).toBe(false); expect(result.current.savedBeforeRefresh).toBe(false);
  expect(api.status).toHaveBeenCalledTimes(1);
});

it('requires a read-only refresh after a version conflict and never retries the write automatically', async () => {
  api.detail.mockResolvedValue({ id: 'fixture' }); api.participants.mockResolvedValue({ participants: [], summary: {} }); api.kpi.mockResolvedValue(null);
  api.payment.mockRejectedValue({ response: { data: { code: 'PAYMENT_VERSION_CONFLICT', message: '다시 조회' } } });
  const { result } = renderHook(() => useFundingOperatorWorkflow('fixture'), { wrapper: FundingBindings });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { expect(await result.current.handlePaymentStatusChange({ id: 'p' } as any, { paymentStatus: 'paid', version: 0 })).toBe(false); });
  expect(result.current.refreshRequired).toBe(true);
  await act(async () => { expect(await result.current.handlePaymentStatusChange({ id: 'p' } as any, { paymentStatus: 'paid', version: 0 })).toBe(false); });
  expect(api.payment).toHaveBeenCalledTimes(1);
  await act(async () => { await result.current.refresh(); });
  expect(result.current.refreshRequired).toBe(false); expect(api.payment).toHaveBeenCalledTimes(1);
});
