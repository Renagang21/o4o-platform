import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ trials: vi.fn(), kpi: vi.fn(), failures: vi.fn(), resolve: vi.fn() }));
vi.mock('../../api/trial', () => ({ getOperatorTrials: mocks.trials, getOperatorMarketTrialKpi: mocks.kpi, getForumSyncFailures: mocks.failures, resolveForumSyncFailure: mocks.resolve }));
import MarketTrialApprovalsPage from './MarketTrialApprovalsPage';
beforeEach(() => { vi.resetAllMocks(); mocks.kpi.mockResolvedValue(null); mocks.trials.mockResolvedValue([]); });
afterEach(cleanup);
it('late responses cannot replace the latest operating-stage filter', async () => {
  let oldResponse!: (data: unknown[]) => void;
  mocks.trials.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; })).mockResolvedValueOnce([{ id: 'fixture', title: '준비 중인 펀딩', status: 'development', currentParticipants: 1 }]);
  render(<MemoryRouter><MarketTrialApprovalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '준비 중', exact: true }));
  await screen.findByText('준비 중인 펀딩');
  await act(async () => oldResponse([{ id: 'stale', title: '이전 응답', status: 'closed', currentParticipants: 0 }]));
  expect(screen.queryByText('이전 응답')).toBeNull();
  await waitFor(() => expect(mocks.trials).toHaveBeenLastCalledWith('development'));
});

const failure = (title = '복구 대상 펀딩') => ({ id: title, trialId: 'fixture-trial', trialTitle: title, stage: 'forum_post_create', severity: 'critical', errorMessage: 'fixture failure', occurredAt: '2026-10-11T00:00:00Z', resolvedAt: null, resolutionNote: null });
const list = (data: ReturnType<typeof failure>[], total = data.length) => ({ data, meta: { total, page: 1, limit: 20 } });
function showFailures() {
  const view = render(<MemoryRouter><MarketTrialApprovalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '포럼 연계 실패', exact: true }));
  return view;
}

it('page-two search requests page one once and ignores the late old page', async () => {
  let oldPage!: (value: unknown) => void;
  mocks.failures.mockResolvedValueOnce(list([failure('첫 페이지')], 21))
    .mockImplementationOnce(() => new Promise(done => { oldPage = done; }))
    .mockResolvedValueOnce(list([failure('검색 결과')]));
  showFailures();
  await screen.findByText('첫 페이지');
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Trial ID 검색' }), { target: { value: ' fixture-query ' } });
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  await screen.findByText('검색 결과');
  expect(mocks.failures).toHaveBeenCalledTimes(3);
  expect(mocks.failures).toHaveBeenLastCalledWith({ resolved: 'false', trialId: 'fixture-query', page: 1, limit: 20 });
  await act(async () => oldPage(list([failure('옛 페이지')]))) ;
  expect(screen.queryByText('옛 페이지')).toBeNull();
});

it('typing a draft ID does not apply it on a status-filter change', async () => {
  mocks.failures.mockResolvedValue(list([]));
  showFailures();
  await screen.findByText('미해결 실패 건이 없습니다.');
  fireEvent.change(screen.getByRole('textbox', { name: 'Trial ID 검색' }), { target: { value: 'unsubmitted' } });
  fireEvent.click(screen.getByRole('button', { name: '해결됨', exact: true }));
  await waitFor(() => expect(mocks.failures).toHaveBeenLastCalledWith(expect.objectContaining({ resolved: 'true', trialId: undefined })));
});

it('resolving the last item reloads the filtered total and returns to the remaining page', async () => {
  let resolve!: (value: unknown) => void;
  mocks.resolve.mockImplementation(() => new Promise(done => { resolve = done; }));
  mocks.failures.mockResolvedValueOnce(list([failure('앞 페이지')], 21))
    .mockResolvedValueOnce(list([failure('마지막 실패')], 21))
    .mockResolvedValueOnce(list([], 20)).mockResolvedValueOnce(list([failure('남은 실패')], 20));
  showFailures();
  await screen.findByText('앞 페이지');
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByText('마지막 실패');
  fireEvent.click(screen.getByRole('button', { name: '해결 처리', exact: true }));
  const dialog = screen.getByRole('dialog', { name: '해결 처리' });
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '복구 확인' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '해결 완료' }));
  fireEvent.click(within(dialog).getByRole('button', { name: '처리 중...' }));
  expect(mocks.resolve).toHaveBeenCalledTimes(1);
  expect((within(dialog).getByRole('button', { name: '취소' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolve({}));
  await screen.findByText('남은 실패');
  expect(screen.queryByText('마지막 실패')).toBeNull();
  expect(screen.getByText('총 20건')).toBeTruthy();
  expect(mocks.failures).toHaveBeenLastCalledWith(expect.objectContaining({ resolved: 'false', page: 1 }));
});

it('read errors have a retry and never masquerade as an empty failure list', async () => {
  mocks.failures.mockRejectedValueOnce(new Error('목록 조회 실패')).mockResolvedValueOnce(list([]));
  showFailures();
  const alert = await screen.findByRole('alert');
  expect(screen.queryByText('미해결 실패 건이 없습니다.')).toBeNull();
  fireEvent.click(within(alert).getByRole('button', { name: '다시 조회' }));
  await screen.findByText('미해결 실패 건이 없습니다.');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('failed resolution preserves the note for retry and an unmounted tab cannot refresh', async () => {
  let complete!: (value: unknown) => void;
  mocks.failures.mockResolvedValue(list([failure()]));
  mocks.resolve.mockRejectedValueOnce(new Error('권한을 확인하세요')).mockImplementationOnce(() => new Promise(done => { complete = done; }));
  const view = showFailures();
  await screen.findByText('복구 대상 펀딩');
  fireEvent.click(screen.getByRole('button', { name: '해결 처리', exact: true }));
  fireEvent.change(screen.getByRole('textbox', { name: '운영 메모' }), { target: { value: '유지할 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '해결 완료' }));
  await screen.findByText('권한을 확인하세요');
  expect((screen.getByRole('textbox', { name: '운영 메모' }) as HTMLTextAreaElement).value).toBe('유지할 메모');
  fireEvent.click(screen.getByRole('button', { name: '해결 완료' }));
  view.unmount();
  await act(async () => complete({}));
  expect(mocks.failures).toHaveBeenCalledTimes(1);
});

it('focuses the resolve note and returns to its action on Escape without resolving', async () => {
  mocks.failures.mockResolvedValue(list([failure()])); showFailures();
  const trigger = await screen.findByRole('button', { name: '해결 처리', exact: true });
  trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: '해결 처리' });
  expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: '운영 메모' }));
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(mocks.resolve).not.toHaveBeenCalled();
});
