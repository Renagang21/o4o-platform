import { act, cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ org: 'store', user: 'staff', get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/client', () => ({ coreApiClient: state }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: state.org }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.user } }) }));
import Page from './StoreMultilingualConsultationPage';
const outgoing = () => fireEvent.change(screen.getByLabelText('고객에게 전달할 한국어 문장'), { target: { value: '진열대 왼쪽에 있습니다.' } });
const translation = () => within(screen.getByRole('region', { name: '문장 번역' }));
const modes = [
  { key: 'counter-pharmacist', label: '매대 약사 상담', professional: true, entitled: true, allowed: false },
  { key: 'floor-staff', label: '매장 직원 응대', professional: false, entitled: true, allowed: true },
  { key: 'floor-pharmacist', label: '매장 약사 상담', professional: true, entitled: false, allowed: false },
];
const context = () => ({ success: true, data: { organizationId: state.org, languages: [{ key: 'en', label: 'English · 영어' }, { key: 'ja', label: '日本語 · 일본어' }],
  phrases: [{ key: 'pharmacist', text: '약사에게 연결하겠습니다.' }], modes } });
const result = (body: Record<string, string>) => ({ success: true, data: { organizationId: state.org, ...body, source: body.text ?? '약사에게 연결하겠습니다.', translation: 'Translated words' } });
beforeEach(() => {
  vi.clearAllMocks(); state.org = 'store'; state.user = 'staff';
  state.get.mockImplementation(async () => context());
  state.post.mockImplementation(async (_path, body) => result(body));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
it('lets the staff tablet type free outgoing text, offers phrases as quick input and shows the result', async () => {
  render(<Page />);
  const editor = await screen.findByLabelText('고객에게 전달할 한국어 문장');
  expect(screen.queryByLabelText('안내 문구')).toBeNull();
  fireEvent.click(within(screen.getByRole('group', { name: '자주 쓰는 안내 문구' })).getByRole('button', { name: '약사에게 연결하겠습니다.' }));
  expect((editor as HTMLTextAreaElement).value).toBe('약사에게 연결하겠습니다.');
  fireEvent.change(editor, { target: { value: '진열대 왼쪽에 있습니다.' } });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  await screen.findAllByText('Translated words');
  expect(state.post).toHaveBeenCalledWith('/neture/pharmacy/multilingual-consultation/translate', { mode: 'floor-staff', language: 'en', direction: 'to-customer', text: '진열대 왼쪽에 있습니다.', reuseSession: expect.any(String) });
  fireEvent.click(screen.getByRole('button', { name: '고객에게 크게 보여주기' }));
  const dialog = screen.getByRole('dialog', { name: '고객용 번역 화면' });
  expect(within(dialog).getByText('Translated words')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '새 상담 · 내용 지우기' }));
  expect(screen.queryByText('Translated words')).toBeNull();
});
it('opens a pharmacist or staff tablet with only that role\'s modes and the tablet name', async () => {
  rtlRender(<MemoryRouter initialEntries={['/consultation/staff?role=staff&name=%EC%9E%85%EA%B5%AC']}><Page /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: '입구' })).toBeTruthy();
  const select = screen.getByLabelText('상담 방식') as HTMLSelectElement;
  expect(select.disabled).toBe(true);
  expect(within(select).getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['floor-staff']);
  expect(screen.queryByText(/고객 화면 연결/)).toBeNull();
  cleanup();
  rtlRender(<MemoryRouter initialEntries={['/consultation/staff?role=pharmacist']}><Page /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: '약사 상담' })).toBeTruthy();
  const pharmacist = screen.getByLabelText('상담 방식') as HTMLSelectElement;
  expect(within(pharmacist).getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['counter-pharmacist', 'floor-pharmacist']);
  expect(screen.queryByRole('region', { name: '문장 번역' })).toBeNull();
});
it('accepts a customer utterance for Korean translation and clears previous content when switching language', async () => {
  render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(screen.getByLabelText('고객이 입력한 문장'), { target: { value: 'Customer utterance' } });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  await screen.findAllByText('Translated words');
  expect(state.post.mock.calls[0][1]).toMatchObject({ direction: 'to-staff', text: 'Customer utterance' });
  expect(screen.queryByRole('button', { name: '고객에게 크게 보여주기' })).toBeNull();
  fireEvent.change(screen.getByLabelText('고객 언어'), { target: { value: 'ja' } });
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('Customer utterance');
  expect(screen.queryByText('Translated words')).toBeNull();
});
it('does not accept a late result for a previous store or account', async () => {
  let finish!: (value: unknown) => void;
  state.post.mockImplementationOnce((_path, body) => new Promise(resolve => { finish = () => resolve(result(body)); }));
  const view = render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  outgoing(); fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  state.user = 'other'; state.org = 'other-store'; view.rerender(<Page />);
  await screen.findByLabelText('고객에게 전달할 한국어 문장'); finish({});
  await waitFor(() => expect(screen.queryByText('Translated words')).toBeNull());
});
it('keeps input on translation failure, supports retry and distinguishes failed context lookup', async () => {
  state.get.mockRejectedValueOnce(new Error('offline'));
  render(<Page />); await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: '번역하기' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 확인' })); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(translation().getByRole('textbox'), { target: { value: 'Original' } });
  state.post.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: '번역하기' })); await screen.findByRole('alert');
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('Original');
  fireEvent.click(screen.getByRole('button', { name: '번역하기' })); await screen.findAllByText('Translated words');
});
it('keeps professional modes unavailable when only a service entitlement exists', async () => {
  render(<Page />); const select = await screen.findByLabelText('상담 방식');
  fireEvent.click(screen.getByText(/상담 방식·고객 언어 ·/));
  expect((within(select).getByRole('option', { name: '매대 약사 상담 · 개인 약사 자격·약국 업무 허용 확인 필요' }) as HTMLOptionElement).disabled).toBe(true);
});
it('clears the customer utterance when leaving the browser page', async () => {
  render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(translation().getByRole('textbox'), { target: { value: 'Transient utterance' } });
  fireEvent(window, new Event('pagehide'));
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
});
it('returns directly from customer display to a focused reply and preserves both directional drafts', async () => {
  render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  outgoing(); fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  await screen.findAllByText('Translated words');
  fireEvent.click(screen.getByRole('button', { name: '고객에게 크게 보여주기' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '고객이 답하기' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  const reply = screen.getByLabelText('고객이 입력한 문장'); expect(document.activeElement).toBe(reply);
  expect(state.post).toHaveBeenCalledOnce();
  fireEvent.change(reply, { target: { value: 'Customer reply' } });
  fireEvent.click(screen.getByRole('button', { name: '직원 → 고객' }));
  expect(screen.getAllByText('Translated words').length).toBeGreaterThan(0);
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('진열대 왼쪽에 있습니다.');
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('Customer reply');
  fireEvent.click(screen.getByRole('button', { name: '새 상담 · 내용 지우기' }));
  fireEvent.click(screen.getByRole('button', { name: '직원 → 고객' }));
  expect(screen.queryByText('Translated words')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
});
it('never restores a late translation after leaving its direction, including after switching back', async () => {
  let finish!: () => void;
  state.post.mockImplementationOnce((_path, body) => new Promise(resolve => { finish = () => resolve(result(body)); }));
  render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  outgoing(); fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  await act(async () => finish());
  fireEvent.click(screen.getByRole('button', { name: '직원 → 고객' }));
  expect(screen.queryByText('Translated words')).toBeNull();
  expect(state.post).toHaveBeenCalledOnce();
});
it('discards inactive content on pagehide and preserves input on language correction', async () => {
  const c = context(); c.data.modes = [{ ...modes[0], allowed: true }]; state.get.mockResolvedValue(c);
  render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  fireEvent.change(translation().getByRole('textbox'), { target: { value: 'Outgoing draft' } });
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(translation().getByRole('textbox'), { target: { value: 'Reply draft' } });
  fireEvent(window, new Event('pagehide'));
  fireEvent.click(screen.getByRole('button', { name: '직원 → 고객' }));
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  fireEvent.change(translation().getByRole('textbox'), { target: { value: 'Another outgoing draft' } });
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(screen.getByLabelText('고객 언어'), { target: { value: 'ja' } });
  fireEvent.click(screen.getByRole('button', { name: '직원 → 고객' }));
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('Another outgoing draft');
});


it('rechecks blocked modes after settings change without issuing a translation or changing permissions', async () => {
  state.get.mockResolvedValueOnce({ ...context(), data: { ...context().data, modes: modes.map(m => ({ ...m, allowed: false })) } });
  render(<Page />); await screen.findByRole('region', { name: '상담 이용 조건 안내' });
  expect(state.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '이용 상태 다시 확인' }));
  await screen.findByLabelText('고객에게 전달할 한국어 문장');
  expect(state.get).toHaveBeenCalledTimes(2);
  expect(state.post).not.toHaveBeenCalled();
});

it('clears private drafts after an explicit access denial and offers recheck rather than another translation', async () => {
  render(<Page />); await screen.findByLabelText('고객에게 전달할 한국어 문장');
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(translation().getByRole('textbox'), { target: { value: 'Transient customer words' } });
  state.post.mockRejectedValueOnce({ status: 403, code: 'PHARMACIST_CONFIRMATION_REQUIRED' });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  await screen.findByRole('alert');
  expect(screen.queryByDisplayValue('Transient customer words')).toBeNull();
  expect(screen.queryByRole('region', { name: '문장 번역' })).toBeNull();
  expect(screen.getByRole('button', { name: '다시 확인' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'My Home' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '새 상담 · 내용 지우기' }));
  expect(screen.queryByText('상담 이용 상태를 확인하는 중…')).toBeNull();
  expect(screen.getByRole('region', { name: '상담 이용 상태 재확인' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '이용 상태 다시 확인' }));
  await screen.findByRole('region', { name: '문장 번역' });
  expect((translation().getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
});
