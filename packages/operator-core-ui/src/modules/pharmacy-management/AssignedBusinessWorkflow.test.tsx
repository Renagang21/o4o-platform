import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './OperatorSemiFranchisePage';
const api = vi.hoisted(() => ({ listAssignedSemiFranchises: vi.fn(), listSfMemberships: vi.fn(), listProposals: vi.fn(),
  listEvents: vi.fn(), listRecruitments: vi.fn(), listContents: vi.fn(), decideEvent: vi.fn(), decideRecruitment: vi.fn(),
  decideSfMembership: vi.fn(), decideProposal: vi.fn(), setContentStatus: vi.fn(), listContentSubmissions: vi.fn(), decideContentSubmission: vi.fn() }));
vi.mock('./api', () => ({ neturePharmacyOperatorApi: api, STATUS_CLASS: {}, STATUS_LABEL: {},
  MEMBERSHIP_ACTIONS_BY_STATUS: { pending: [{ action: 'approve', label: '승인' }] }, formatDateTime: () => '-', formatWon: String }));
const businesses = [{ key: 'pharmacy', name: '가상 약국 사업', status: 'active' }, { key: 'other', name: '가상 다른 사업', status: 'active' }];
const event = { id: 'event-a', productName: '가상 행사 제품', status: 'pending', supplierName: '가상 공급자' };
const recruitment = { id: 'recruitment-a', productName: '가상 모집 제품', status: 'open', exposureStatus: 'pending' };
beforeEach(() => {
  vi.resetAllMocks(); api.listAssignedSemiFranchises.mockResolvedValue(businesses);
  api.listSfMemberships.mockResolvedValue([]); api.listEvents.mockResolvedValue([event]);
  api.listRecruitments.mockResolvedValue([recruitment]); api.listContents.mockResolvedValue([]);
  api.listContentSubmissions.mockResolvedValue([]);
});
afterEach(cleanup);
function show(pharmacy = false) { return render(<MemoryRouter><Page businessKey={pharmacy ? 'pharmacy' : undefined} /></MemoryRouter>); }
function deferred() { let resolve!: (value: unknown) => void; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
async function events() {
  await screen.findByRole('heading', { name: '담당 약국 협력사업' });
  fireEvent.click(screen.getByRole('button', { name: '이벤트' }));
  await screen.findByText(event.productName);
}
const rowAction = (name: string, action: string) => within(screen.getByText(name).closest('tr')!).getByRole('button', { name: action });
const confirm = () => fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
it.each(['approve', 'reject'] as const)('reviews supplier submissions in the selected business (%s) without removing own content creation', async action => {
  api.listContentSubmissions.mockResolvedValue([{ id: 'submitted-a', status: 'pending', supplierName: 'Synthetic supplier', content: { title: 'Submitted material', body: '<p>Submitted body</p>', summary: '', attachments: [] } }]);
  api.decideContentSubmission.mockResolvedValue({}); show();
  await screen.findByRole('heading', { name: '담당 약국 협력사업' });
  fireEvent.click(screen.getByRole('button', { name: '콘텐츠', exact: true }));
  expect(await screen.findByRole('link', { name: '콘텐츠 작성' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '공급자 콘텐츠 심사' }));
  await screen.findByText('Submitted material');
  fireEvent.click(rowAction('Submitted material', action === 'approve' ? '승인·게시' : '반려'));
  if (action === 'reject') fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: 'Review note' } });
  expect(api.decideContentSubmission).not.toHaveBeenCalled(); confirm();
  await waitFor(() => {
    if (action === 'reject') expect(api.decideContentSubmission).toHaveBeenCalledWith('pharmacy', 'submitted-a', action, 'Review note');
    else expect(api.decideContentSubmission).toHaveBeenCalledWith('pharmacy', 'submitted-a', action);
  });
});
it.each([false, true])('failed event decision preserves reason/target and retries within the selected business (%s)', async pharmacy => {
  api.decideEvent.mockRejectedValueOnce(new Error('가상 처리 실패')).mockResolvedValueOnce({});
  show(pharmacy); await events(); fireEvent.click(rowAction(event.productName, '반려'));
  expect(screen.getByRole('dialog').textContent).toContain(event.productName);
  fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: ' 검토 사유 ' } }); confirm();
  await screen.findByRole('alert'); expect((screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value).toBe(' 검토 사유 ');
  expect((screen.getByLabelText('담당 사업') as HTMLSelectElement).disabled).toBe(true);
  confirm(); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(api.decideEvent.mock.calls).toEqual([['pharmacy', 'event-a', 'reject', '검토 사유'], ['pharmacy', 'event-a', 'reject', '검토 사유']]);
});
it('keeps successful write distinct from refresh failure and retries only the list', async () => {
  api.listEvents.mockResolvedValueOnce([event]).mockRejectedValueOnce(new Error('목록 실패')).mockResolvedValueOnce([]);
  api.decideEvent.mockResolvedValue({}); show(); await events();
  fireEvent.click(rowAction(event.productName, '승인')); confirm();
  await screen.findByText(/처리는 완료되었습니다/); expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '목록 다시 조회' }));
  await screen.findByText('해당하는 이벤트가 없습니다.'); expect(api.decideEvent).toHaveBeenCalledTimes(1);
});
it('does not submit until confirmation, supports cancel, and preserves the recruitment condition contract', async () => {
  api.decideRecruitment.mockResolvedValue({}); show();
  await screen.findByRole('heading', { name: '담당 약국 협력사업' });
  fireEvent.click(screen.getByRole('button', { name: '모집 조건' })); await screen.findByText(recruitment.productName);
  fireEvent.click(rowAction(recruitment.productName, '반려'));
  expect(api.decideRecruitment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '닫기' })); expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(rowAction(recruitment.productName, '승인')); confirm();
  await waitFor(() => expect(api.decideRecruitment).toHaveBeenCalledWith('pharmacy', 'recruitment-a', 'approve', undefined));
  expect(screen.queryByText('참여 승인')).toBeNull();
});
it('serializes confirmation, locks scope and traps dialog focus until the write ends', async () => {
  const pending = deferred(); api.decideEvent.mockReturnValue(pending.promise); show(); await events();
  fireEvent.click(rowAction(event.productName, '반려'));
  const dialog = screen.getByRole('dialog'); const reason = screen.getByLabelText('처리 사유');
  expect(document.activeElement).toBe(reason);
  within(dialog).getByRole('button', { name: '처리 확인' }).focus(); fireEvent.keyDown(dialog, { key: 'Tab' });
  expect(document.activeElement).toBe(reason);
  act(() => { confirm(); confirm(); }); fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(api.decideEvent).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).not.toBeNull();
  fireEvent.change(screen.getByLabelText('담당 사업'), { target: { value: 'other' } });
  expect(api.listEvents).toHaveBeenLastCalledWith('pharmacy', 'pending');
  await act(async () => pending.resolve({})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('ignores a previous write when the scoped consumer is replaced', async () => {
  const pending = deferred(); api.decideEvent.mockReturnValue(pending.promise);
  const view = show(); await events(); fireEvent.click(rowAction(event.productName, '승인')); confirm();
  const reads = api.listEvents.mock.calls.length;
  view.rerender(<MemoryRouter><Page businessKey="other" /></MemoryRouter>);
  await screen.findByRole('option', { name: /가상 다른 사업/ });
  await act(async () => pending.resolve({}));
  expect(screen.queryByText('승인 처리했습니다.')).toBeNull(); expect(api.listEvents).toHaveBeenCalledTimes(reads);
});
it('does not let an earlier same-business read win after an A→B→A transition', async () => {
  const pending = deferred(); api.listSfMemberships.mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  show(); const select = await screen.findByLabelText('담당 사업');
  fireEvent.change(select, { target: { value: 'other' } });
  await waitFor(() => expect(api.listSfMemberships).toHaveBeenLastCalledWith('other', 'pending'));
  fireEvent.change(select, { target: { value: 'pharmacy' } });
  await waitFor(() => expect(api.listSfMemberships).toHaveBeenCalledTimes(3));
  await act(async () => pending.resolve([{ id: 'old', organizationName: '오래된 신청', status: 'pending' }]));
  expect(screen.queryByText('오래된 신청')).toBeNull();
});

it('does not open an old row decision in the same turn as a business switch', async () => {
  api.listSfMemberships.mockResolvedValue([{ id: 'old-member', organizationName: '이전 가입 신청', status: 'pending' }]);
  show(); await screen.findByText('이전 가입 신청');
  const oldAction = rowAction('이전 가입 신청', '승인');
  act(() => {
    fireEvent.change(screen.getByLabelText('담당 사업'), { target: { value: 'other' } });
    fireEvent.click(oldAction);
  });
  expect(screen.queryByRole('dialog')).toBeNull(); expect(api.decideSfMembership).not.toHaveBeenCalled();
});
