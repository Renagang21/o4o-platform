import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './OperatorCertificatesPage';
const api = vi.hoisted(() => ({ issueCertificate: vi.fn(), renewCertificate: vi.fn(), revokeCertificate: vi.fn(), certificateOperations: vi.fn(), missingCertificates: vi.fn() }));
vi.mock('../../api/lecture', () => ({ operatorApi: api, errorMessage: () => '처리 실패' }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
beforeEach(() => { vi.resetAllMocks(); api.missingCertificates.mockResolvedValue({ data: { items: [] } }); });
afterEach(cleanup);
it('connects the issued certificate to renewal and public verification', async () => {
  api.issueCertificate.mockResolvedValue({ data: { certificate: { id: 'cert', certificateNumber: 'SAMPLE', verificationCode: 'verify-code' } } });
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('학습자 userId'), { target: { value: 'student' } });
  fireEvent.change(screen.getByLabelText('강의 courseId'), { target: { value: 'course' } });
  fireEvent.click(screen.getByRole('button', { name: '발급' }));
  await screen.findByRole('status');
  expect((screen.getByLabelText('수료증 id') as HTMLInputElement).value).toBe('cert');
  expect((screen.getByLabelText('verificationCode') as HTMLInputElement).value).toBe('verify-code');
  fireEvent.change(screen.getByLabelText('갱신 기간(개월)'), { target: { value: '0' } });
  expect((screen.getByRole('button', { name: '갱신' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('갱신 기간(개월)'), { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: '갱신' }));
  await waitFor(() => expect(api.renewCertificate).toHaveBeenCalledWith('cert', 6, expect.stringMatching(/^[0-9a-f-]{36}$/)));
});
it('retains the target and shows persistent errors after a failed renewal', async () => {
  api.renewCertificate.mockRejectedValue(new Error('fixture'));
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('수료증 id'), { target: { value: 'cert' } });
  fireEvent.click(screen.getByRole('button', { name: '갱신' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('수료증 id') as HTMLInputElement).value).toBe('cert');
});

it('retains a failed revocation reason and retries the captured target', async () => {
  api.revokeCertificate.mockRejectedValueOnce(new Error('fixture')).mockResolvedValue({});
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('수료증 id'), { target: { value: 'cert-a' } });
  fireEvent.click(screen.getByRole('button', { name: '폐기' }));
  const dialog = () => within(screen.getByRole('dialog'));
  fireEvent.change(dialog().getByRole('textbox'), { target: { value: '잘못 발급된 수료증' } });
  fireEvent.click(dialog().getByRole('button', { name: '처리 확인' }));
  await dialog().findByRole('alert');
  expect((dialog().getByRole('textbox') as HTMLTextAreaElement).value).toBe('잘못 발급된 수료증');
  fireEvent.click(dialog().getByRole('button', { name: '처리 확인' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(api.revokeCertificate).toHaveBeenNthCalledWith(2, 'cert-a', '잘못 발급된 수료증', expect.any(String));
  // The retry of the same failed request carries the same operationId (server applies it at most once).
  expect(api.revokeCertificate.mock.calls[1][2]).toBe(api.revokeCertificate.mock.calls[0][2]);
  expect(screen.getByRole('status').textContent).toContain('cert-a');
});
it('blocks other certificate commands during issue and ignores a late unmounted response', async () => {
  let done!: (value: unknown) => void;
  api.issueCertificate.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
  const view = render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('학습자 userId'), { target: { value: 'student' } });
  fireEvent.change(screen.getByLabelText('강의 courseId'), { target: { value: 'course' } });
  fireEvent.change(screen.getByLabelText('수료증 id'), { target: { value: 'cert-a' } });
  fireEvent.click(screen.getByRole('button', { name: '발급' }));
  fireEvent.click(screen.getByRole('button', { name: '갱신' }));
  expect(api.issueCertificate).toHaveBeenCalledTimes(1); expect(api.renewCertificate).not.toHaveBeenCalled();
  view.unmount();
  await act(async () => done({ data: { certificate: { id: 'old', certificateNumber: 'OLD' } } }));
  render(<MemoryRouter><Page /></MemoryRouter>);
  expect((screen.getByLabelText('수료증 id') as HTMLInputElement).value).toBe('');
  expect(screen.queryByText(/OLD/)).toBeNull();
});

it('loads private operation history and clears it when the target changes', async () => {
 api.certificateOperations.mockResolvedValue({data:{operations:[{actorId:'synthetic-operator',at:'2026-10-22',action:'revoke',reason:'잘못된 발급',before:{isValid:true},after:{isValid:false}}],page:1,hasMore:false}});
 render(<MemoryRouter><Page /></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('수료증 id'),{target:{value:'cert-a'}});
 fireEvent.click(screen.getByRole('button',{name:'처리 이력 조회'}));await screen.findByText(/잘못된 발급/);
 expect(screen.getByText(/폐기 · 처리자 synthetic-operator · 잘못된 발급 · 유효 → 무효/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText('수료증 id'),{target:{value:'cert-b'}});expect(screen.queryByText(/잘못된 발급/)).toBeNull();
});
it('labels issue/renew/update rows, shows automatic issuance, and pages older history', async () => {
 api.certificateOperations
  .mockResolvedValueOnce({data:{operations:[
   {actorId:'synthetic-operator',at:'2026-10-23',action:'renew',reason:null,months:6,before:{isValid:false},after:{isValid:true,expiresAt:'2027-04-23T00:00:00.000Z'}},
   {actorId:'synthetic-operator',at:'2026-10-22',action:'update',reason:null,changedFields:['badgeUrl'],before:{isValid:true},after:{isValid:true}}],page:1,hasMore:true}})
  .mockResolvedValueOnce({data:{operations:[{actorId:null,at:'2026-10-21',action:'issue',reason:null,trigger:'completion',before:null,after:{isValid:true}}],page:2,hasMore:false}});
 render(<MemoryRouter><Page /></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('수료증 id'),{target:{value:'cert-a'}});
 fireEvent.click(screen.getByRole('button',{name:'처리 이력 조회'}));
 await screen.findByText(/갱신 · 처리자 synthetic-operator · 6개월 · 무효 → 유효/);
 expect(screen.getByText(/수정 · 처리자 synthetic-operator · badgeUrl/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'이전 이력 더 보기'}));
 await screen.findByText(/발급 · 수료 시 자동 · 없음 → 유효/);
 expect(api.certificateOperations).toHaveBeenLastCalledWith('cert-a', 2);
 expect(screen.getAllByRole('listitem')).toHaveLength(3);
 expect(screen.queryByRole('button',{name:'이전 이력 더 보기'})).toBeNull();
});
