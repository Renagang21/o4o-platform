import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ detail: vi.fn(), participants: vi.fn(), kpi: vi.fn(), payment: vi.fn(), csv: vi.fn(), status: vi.fn() }));
vi.mock('../../api/trial', async original => ({ ...await original<any>(), getOperatorTrialDetail: mocks.detail, getOperatorTrialParticipants: mocks.participants, getOperatorTrialKpi: mocks.kpi, updateParticipantPaymentStatus: mocks.payment, exportParticipantsCSV: mocks.csv, updateTrialStatus: mocks.status }));
import MarketTrialApprovalDetailPage from './MarketTrialApprovalDetailPage';
const p = { id: 'fixture-participant', name: '샘플 참여자', type: 'store_owner', rewardType: 'product', rewardStatus: 'pending', joinedAt: '2026-10-01T00:00:00Z', paymentStatus: 'paid', paidAmount: 12000, paidAt: '2026-10-01T00:00:00Z', confirmedAt: null };
const data = { participants: [p], summary: { totalCount: 1, productCount: 1, cashCount: 0, pendingCount: 1, fulfilledCount: 0, fulfillmentRate: 0 } };
function Switch() { const go = useNavigate(); return <button onClick={() => go('/operator/market-trial/project-b')}>다른 펀딩</button>; }
const renderPage = () => render(<MemoryRouter initialEntries={['/operator/market-trial/project-a']}><Switch /><Routes><Route path="/operator/market-trial/:id" element={<MarketTrialApprovalDetailPage />} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks(); mocks.kpi.mockResolvedValue(null); mocks.payment.mockResolvedValue({}); mocks.csv.mockResolvedValue(undefined);
  mocks.detail.mockImplementation(async id => ({ id, title: `테스트 ${id}`, status: 'recruiting', currentParticipants: 1, maxParticipants: 10 }));
  mocks.participants.mockResolvedValue(data);
});
afterEach(cleanup);

it('shows participant failures separately and retries without hiding the trial', async () => {
  mocks.participants.mockRejectedValueOnce(new Error('참여자 조회 실패')); renderPage();
  expect((await screen.findByRole('alert')).textContent).toContain('참여자 조회 실패');
  expect(screen.getByRole('heading', { name: '테스트 project-a' })).toBeTruthy();
  expect(screen.queryByText('아직 참여자가 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('참여 이행 관리'); expect(screen.queryByRole('alert')).toBeNull();
});

it('uses the same combined conditions for the participant list and its CSV with no detail reload', async () => {
  renderPage(); await screen.findByText('참여 이행 관리');
  fireEvent.change(screen.getByLabelText('입금 상태'), { target: { value: 'paid' } });
  await waitFor(() => expect(mocks.participants).toHaveBeenLastCalledWith('project-a', { paymentStatus: 'paid' }));
  await screen.findByText('참여 이행 관리'); fireEvent.click(screen.getByRole('button', { name: '제품 보상', exact: true }));
  await waitFor(() => expect(mocks.participants).toHaveBeenLastCalledWith('project-a', { rewardType: 'product', paymentStatus: 'paid' }));
  await screen.findByText('참여 이행 관리'); fireEvent.click(screen.getByRole('button', { name: '현재 조건 CSV 내보내기' }));
  await waitFor(() => expect(mocks.csv).toHaveBeenCalledWith('project-a', { rewardType: 'product', paymentStatus: 'paid' }));
  expect(mocks.detail).toHaveBeenCalledTimes(1);
});

it('an old payment response cannot refresh or overwrite a newly selected trial', async () => {
  let done!: (value: unknown) => void;
  mocks.payment.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
  renderPage(); await screen.findByText('참여 이행 관리');
  fireEvent.click(screen.getByRole('button', { name: '재확인·정정' })); fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));
  await waitFor(() => expect(mocks.payment).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: '다른 펀딩' })); await screen.findByRole('heading', { name: '테스트 project-b' });
  await act(async () => done({}));
  expect(mocks.participants.mock.calls.filter(([id]) => id === 'project-a')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: '테스트 project-b' })).toBeTruthy();
});

it('an initial slow KPI response cannot overwrite the refreshed payment report', async () => {
  let first!: (value: unknown) => void;
  const kpi = (totalPaidAmount: number) => ({ participantCount: 1, paidParticipantCount: 1, unpaidParticipantCount: 0, refundCount: 0, totalPaidAmount });
  mocks.kpi.mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce(kpi(24000));
  renderPage(); await screen.findByText('참여 이행 관리');
  fireEvent.click(screen.getByRole('button', { name: '재확인·정정' }));
  fireEvent.change(screen.getByLabelText('입금 확인 금액 (원)'), { target: { value: '24000' } });
  fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));
  await screen.findByText('24,000원');
  await act(async () => first(kpi(12000)));
  expect(screen.getByText('24,000원')).toBeTruthy();
});

it('refreshes stage, participants and KPI after a manual transition', async () => {
  mocks.status.mockResolvedValue({});
  mocks.detail.mockResolvedValueOnce({ id: 'project-a', title: '테스트 project-a', status: 'recruiting', currentParticipants: 1 })
    .mockResolvedValue({ id: 'project-a', title: '테스트 project-a', status: 'development', currentParticipants: 2 });
  renderPage(); await screen.findByText('참여 이행 관리');
  fireEvent.click(screen.getByRole('button', { name: '준비 중으로 전환' }));
  fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
  await waitFor(() => expect(mocks.status).toHaveBeenCalledWith('project-a', 'development'));
  await screen.findByRole('button', { name: '결과 확정으로 전환' });
  expect(mocks.participants).toHaveBeenCalledTimes(2);
  expect(mocks.kpi).toHaveBeenCalledTimes(2);
});

it('an old transition failure cannot close another trial dialog or set its error', async () => {
  let fail!: (error: Error) => void;
  mocks.status.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  renderPage(); await screen.findByText('참여 이행 관리');
  fireEvent.click(screen.getByRole('button', { name: '준비 중으로 전환' }));
  fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
  await waitFor(() => expect(mocks.status).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: '다른 펀딩' }));
  await screen.findByRole('heading', { name: '테스트 project-b' });
  expect(screen.queryByRole('button', { name: '확인', exact: true })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '준비 중으로 전환' }));
  await act(async () => fail(new Error('이전 펀딩 실패')));
  expect(screen.queryByText('이전 펀딩 실패')).toBeNull();
  expect(screen.getByRole('button', { name: '확인', exact: true })).toBeTruthy();
  expect(mocks.detail.mock.calls.filter(([id]) => id === 'project-a')).toHaveLength(1);
});
