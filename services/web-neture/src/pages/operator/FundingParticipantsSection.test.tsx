import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FundingParticipantsSection, { fundingParticipantFilters } from './FundingParticipantsSection';

const participant: any = { id: 'fixture-participant', name: '샘플 참여자', type: 'store_owner', rewardType: 'product', rewardStatus: 'pending', joinedAt: '2026-10-01T00:00:00Z', paymentStatus: 'paid', paidAmount: 12000, paidAt: '2026-10-01T00:00:00Z', confirmedAt: '2026-10-11T00:00:00Z', paymentReference: 'fixture-reference', paymentNote: '기존 메모' };
const save = vi.fn();
const props = () => ({ participants: [participant], totalCount: 1, trialStatus: 'recruiting' as const, filter: 'all' as const, paymentFilter: '' as const, onFilterChange: vi.fn(), onPaymentFilterChange: vi.fn(), onExport: vi.fn(), exportLoading: false, onToggleRewardStatus: vi.fn(), updatingId: null, onPaymentStatusChange: save, updatingPaymentId: null, loading: false, error: '', onRetry: vi.fn() });
beforeEach(() => { vi.clearAllMocks(); save.mockResolvedValue(true); });
afterEach(cleanup);

it('retains correction inputs on failure, then closes only after a successful save', async () => {
  save.mockResolvedValueOnce(false); render(<FundingParticipantsSection {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: '재확인·정정' }));
  fireEvent.change(screen.getByLabelText('운영자 메모 (선택)'), { target: { value: '수정한 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect((screen.getByLabelText('운영자 메모 (선택)') as HTMLTextAreaElement).value).toBe('수정한 메모');
  fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: '기록 저장' })).toBeNull());
  expect(save.mock.calls[0][1]).toMatchObject({ paymentStatus: 'paid', paidAmount: 12000, paymentNote: '수정한 메모' });
  expect(save.mock.calls[0][1]).not.toHaveProperty('paidAt');
});

it.each(['입금 확인 취소', '환불 완료 기록'])('%s preserves amount/reference/date and records only status and reason', async action => {
  render(<FundingParticipantsSection {...props()} />); fireEvent.click(screen.getByRole('button', { name: action }));
  fireEvent.change(screen.getByLabelText('처리 사유 (선택)'), { target: { value: '테스트 사유' } });
  fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][1]).toEqual({ paymentStatus: action === '입금 확인 취소' ? 'unpaid' : 'refunded', paymentNote: '테스트 사유' });
});

it('a refunded record can be reconfirmed and cleared note/reference are explicit null', async () => {
  render(<FundingParticipantsSection {...props()} participants={[{ ...participant, paymentStatus: 'refunded' }]} />);
  fireEvent.click(screen.getByRole('button', { name: '수기 송금 확인' }));
  fireEvent.change(screen.getByLabelText('송금 참조 (선택)'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('운영자 메모 (선택)'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));
  await waitFor(() => expect(save.mock.calls[0][1]).toMatchObject({ paymentStatus: 'paid', paymentReference: null, paymentNote: null }));
});

it.each(['-1', '0.001', '10000000000'])('invalid amount %s cannot be saved', value => {
  render(<FundingParticipantsSection {...props()} />); fireEvent.click(screen.getByRole('button', { name: '재확인·정정' }));
  fireEvent.change(screen.getByLabelText('입금 확인 금액 (원)'), { target: { value } });
  expect((screen.getByRole('button', { name: '기록 저장' }) as HTMLButtonElement).disabled).toBe(true);
  expect(save).not.toHaveBeenCalled();
});

it('loading and failure never show a stale editable participant list', () => {
  const options = props(); const view = render(<FundingParticipantsSection {...options} loading />);
  expect(screen.getByRole('status').textContent).toContain('불러오는 중'); expect(screen.queryByText('샘플 참여자')).toBeNull();
  view.rerender(<FundingParticipantsSection {...options} error="조회 실패" />);
  expect(screen.getByRole('alert').textContent).toContain('조회 실패'); expect(screen.queryByText('샘플 참여자')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); expect(options.onRetry).toHaveBeenCalled();
});

it('combines participation and payment conditions without confusing their pending statuses', () => {
  expect(fundingParticipantFilters('pending', 'paid')).toEqual({ rewardStatus: 'pending', paymentStatus: 'paid' });
  expect(fundingParticipantFilters('product', 'pending')).toEqual({ rewardType: 'product', paymentStatus: 'pending' });
});

it('locks filters and export during a reward mutation so its response cannot reload obsolete conditions', () => {
  render(<FundingParticipantsSection {...props()} updatingId={participant.id} />);
  expect((screen.getByRole('combobox', { name: '입금 상태' }) as HTMLSelectElement).disabled).toBe(true);
  for (const name of ['제품 보상', '현재 조건 CSV 내보내기', '재확인·정정']) {
    expect((screen.getByRole('button', { name, exact: true }) as HTMLButtonElement).disabled).toBe(true);
  }
});
