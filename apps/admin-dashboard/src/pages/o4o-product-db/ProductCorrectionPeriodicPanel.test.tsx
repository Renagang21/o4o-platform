import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCorrectionPeriodicPanel from './ProductCorrectionPeriodicPanel';
const mocks = vi.hoisted(() => ({
  api: {
    dashboard: vi.fn(),
    renewals: vi.fn(),
    renewal: vi.fn(),
    saveRenewal: vi.fn(),
    bulk: vi.fn(),
    createBulk: vi.fn(),
    controlBulk: vi.fn(),
    stepBulk: vi.fn(),
    bulkPages: vi.fn(),
    schedules: vi.fn(),
    schedule: vi.fn(),
    saveSchedule: vi.fn(),
    notices: vi.fn(),
    acknowledge: vi.fn(),
  },
  rules: vi.fn(),
  createBatch: vi.fn(),
}));
vi.mock('@/api/product-correction-periodic.api', () => ({
  productCorrectionPeriodicApi: mocks.api,
}));
vi.mock('@/api/product-correction.api', () => ({
  productCorrectionApi: { rules: mocks.rules, createBatch: mocks.createBatch },
}));
const rule = {
  id: 'rule',
  title: '기준',
  revision: 1,
  enabled: true,
  purpose: 'professional',
  descriptionType: 'STORE',
  language: 'ko',
};
const job = {
  id: 'job',
  revision: 2,
  ruleSnapshot: rule,
  status: 'running',
  cursor: 25,
  total: 28,
  matched: 25,
  skipped: 0,
  attempts: 0,
  createdAt: '2026-10-25T00:00:00Z',
};
const renewal = {
  id: 'renewal',
  revision: 1,
  productId: 'product',
  productName: '합성 상품',
  descriptionType: 'STORE',
  language: 'ko',
  state: 'pending',
  purposes: ['professional'],
  notes: '',
};
const empty = { items: [], total: 0, page: 1, pageSize: 10 };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rules.mockResolvedValue([rule]);
  mocks.api.dashboard.mockResolvedValue({
    renewalOpen: 1,
    evidenceWaiting: 2,
    proposalPending: 3,
    proposalUnapplied: 4,
    proposalFailed: 0,
    bulkOpen: 1,
    bulkFailed: 0,
    bulkPaused: 0,
    scheduleDue: 0,
    noticeUnread: 1,
    lastTickAt: null,
  });
  mocks.api.renewals.mockResolvedValue({ ...empty, items: [renewal], total: 1 });
  mocks.api.renewal.mockResolvedValue({
    record: renewal,
    fingerprint: 'a'.repeat(64),
    productExists: true,
    description: { id: 'description', content: '원문', summary: null },
  });
  mocks.api.bulk.mockResolvedValue({ ...empty, items: [job], total: 1 });
  mocks.api.bulkPages.mockResolvedValue({
    job,
    run: {
      result: {
        items: [
          {
            id: 'product',
            name: '합성 상품',
            reason: '확인',
            fingerprint: 'a'.repeat(64),
            runId: 'run',
          },
        ],
      },
    },
    totalPages: 1,
    page: 1,
  });
  mocks.api.acknowledge.mockResolvedValue({
    id: 'notice',
    title: '후보 점검 완료',
    createdAt: '2026-10-25T00:00:00Z',
    acknowledgedAt: '2026-10-25T01:00:00Z',
  });
  mocks.api.schedules.mockResolvedValue(empty);
  mocks.api.schedule.mockResolvedValue(null);
  mocks.api.notices.mockResolvedValue({
    ...empty,
    items: [{ id: 'notice', title: '후보 점검 완료', createdAt: '2026-10-25T00:00:00Z' }],
    total: 1,
  });
});
async function open(canWrite = true) {
  render(<ProductCorrectionPeriodicPanel canWrite={canWrite} />);
  fireEvent.click(screen.getByText('정기 관리 현황 불러오기·새로고침'));
  await screen.findByLabelText('통합 관리 현황');
}
describe('상품 정기 관리 4~6번', () => {
  it('does not run a job or enable scheduling when merely opening the dashboard', async () => {
    await open();
    expect(mocks.api.createBulk).not.toHaveBeenCalled();
    expect(mocks.api.stepBulk).not.toHaveBeenCalled();
    expect(mocks.api.saveSchedule).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('알림 확인'));
    await waitFor(() => expect(mocks.api.acknowledge).toHaveBeenCalledWith('notice'));
    expect(mocks.api.saveRenewal).not.toHaveBeenCalled();
  });
  it('saves an explicit Korean-time schedule separately from manual bulk search', async () => {
    mocks.api.saveSchedule.mockResolvedValue({ id: 'rule', revision: 1 });
    await open();
    fireEvent.change(screen.getByLabelText('정기 관리 기준'), { target: { value: 'rule' } });
    await screen.findByLabelText('예약 사용');
    await waitFor(() => expect(screen.getByLabelText('예약 예정 한국시간')).not.toHaveValue(''));
    fireEvent.change(screen.getByLabelText('대량 점검 검색'), { target: { value: '수동 검색' } });
    fireEvent.click(screen.getByLabelText('예약 사용'));
    fireEvent.change(screen.getByLabelText('예약 예정 한국시간'), {
      target: { value: '2030-01-02T10:30' },
    });
    fireEvent.click(screen.getByText('예약 저장'));
    await waitFor(() =>
      expect(mocks.api.saveSchedule).toHaveBeenCalledWith(
        'rule',
        expect.objectContaining({
          enabled: true,
          timeZone: 'Asia/Seoul',
          nextDueAt: '2030-01-02T01:30:00.000Z',
        }),
      ),
    );
    expect(mocks.api.createBulk).not.toHaveBeenCalled();
  });
  it('preserves renewal notes on source conflicts and never implies that review publishes descriptions', async () => {
    mocks.api.saveRenewal.mockRejectedValue(new Error('원본 충돌'));
    await open();
    fireEvent.click(screen.getByRole('button', { name: /갱신 검토 열기:/ }));
    await screen.findByLabelText('갱신 검토 메모');
    fireEvent.change(screen.getByLabelText('갱신 검토 메모'), { target: { value: '입력 보존' } });
    fireEvent.change(screen.getByLabelText('갱신 검토 상태'), { target: { value: 'done' } });
    fireEvent.click(screen.getByText('갱신 검토 기록 저장'));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('갱신 검토 메모')).toHaveValue('입력 보존');
    expect(mocks.api.saveRenewal).toHaveBeenCalledWith(
      expect.objectContaining({ fingerprint: 'a'.repeat(64) }),
      expect.objectContaining({ state: 'done', notes: '입력 보존' }),
    );
  });
  it('controls a bulk job with its revision and connects selected results to existing work creation', async () => {
    mocks.api.controlBulk.mockResolvedValue({ ...job, status: 'paused', revision: 3 });
    mocks.createBatch.mockResolvedValue({
      id: 'batch',
      items: [],
      selectionResult: { createdCount: 1 },
    });
    await open();
    fireEvent.click(screen.getByRole('button', { name: /실행 결과 열기:/ }));
    await screen.findByLabelText('선택 대량 점검');
    fireEvent.click(screen.getByText('실행 일시 중지'));
    await waitFor(() => expect(mocks.api.controlBulk).toHaveBeenCalledWith(job, 'pause'));
    fireEvent.click(screen.getByLabelText('합성 상품 · 확인'));
    fireEvent.click(screen.getByText('이 결과에서 선택 상품 작업 만들기'));
    await screen.findByRole('link', { name: '선택 상품 작업 열기' });
    expect(mocks.createBatch).toHaveBeenCalledWith(
      rule,
      { search: undefined, page: 1 },
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ id: 'product' })]),
    );
  });
  it('keeps exhausted failures stopped until an explicit manual resume', async () => {
    const failed = { ...job, status: 'failed', attempts: 3, errorCode: 'BULK_STEP_FAILED' };
    mocks.api.bulkPages.mockResolvedValue({ job: failed, run: null, totalPages: 0, page: 1 });
    await open();
    fireEvent.click(screen.getByRole('button', { name: /실행 결과 열기:/ }));
    await screen.findByText(/자동 재시도 종료·수동 재개 필요/);
    expect(screen.getByText('다음 25개 점검')).toBeDisabled();
    expect(screen.getByText('실행 재개·재시도')).not.toBeDisabled();
    expect(mocks.api.controlBulk).not.toHaveBeenCalled();
    expect(mocks.api.stepBulk).not.toHaveBeenCalled();
  });
  it('keeps a created job visible when its result refresh fails instead of reporting creation failure', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('정기 관리 기준'), { target: { value: 'rule' } });
    await waitFor(() => expect(screen.getByLabelText('예약 예정 한국시간')).not.toHaveValue(''));
    mocks.api.createBulk.mockResolvedValue({ ...job, status: 'queued', cursor: 0 });
    mocks.api.bulkPages.mockRejectedValue(new Error('후속 조회 실패'));
    fireEvent.click(screen.getByText('대량 후보 점검 만들기'));
    await screen.findByText(/작업은 저장됐지만 최신 현황/);
    expect(screen.getByRole('status')).toHaveTextContent('고정 후보 목록을 저장했습니다');
    expect(screen.getByLabelText('선택 대량 점검')).toHaveTextContent('0/28');
    expect(mocks.api.createBulk).toHaveBeenCalledTimes(1);
  });
  it('preserves the saved schedule revision after a failed dashboard refresh', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('정기 관리 기준'), { target: { value: 'rule' } });
    await waitFor(() => expect(screen.getByLabelText('예약 예정 한국시간')).not.toHaveValue(''));
    mocks.api.saveSchedule.mockResolvedValue({ id: 'rule', revision: 1 });
    mocks.api.dashboard.mockRejectedValue(new Error('현황 실패'));
    fireEvent.click(screen.getByText('예약 저장'));
    await screen.findByText(/작업은 저장됐지만 최신 현황/);
    expect(screen.getByRole('status')).toHaveTextContent('예약을 저장했습니다');
    fireEvent.change(screen.getByLabelText('예약 간격'), { target: { value: '31' } });
    fireEvent.click(screen.getByText('예약 저장'));
    await waitFor(() =>
      expect(mocks.api.saveSchedule).toHaveBeenLastCalledWith(
        'rule',
        expect.objectContaining({ revision: 1, intervalDays: 31 }),
      ),
    );
  });
  it('keeps all write actions disabled without common product DB write access', async () => {
    await open(false);
    expect(screen.getByText('대량 후보 점검 만들기')).toBeDisabled();
    expect(screen.getByText('알림 확인')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /갱신 검토 열기:/ }));
    await screen.findByLabelText('갱신 검토 메모');
    expect(screen.getByLabelText('갱신 검토 메모')).toBeDisabled();
    expect(screen.getByText('갱신 검토 기록 저장')).toBeDisabled();
  });
  it('reports a failed dashboard request without displaying false zero totals', async () => {
    mocks.api.dashboard.mockRejectedValue(new Error('조회 실패'));
    render(<ProductCorrectionPeriodicPanel canWrite />);
    fireEvent.click(screen.getByText('정기 관리 현황 불러오기·새로고침'));
    await screen.findByRole('alert');
    expect(screen.queryByLabelText('통합 관리 현황')).not.toBeInTheDocument();
  });
});
