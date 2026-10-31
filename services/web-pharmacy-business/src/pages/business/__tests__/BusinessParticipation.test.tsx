import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), user: { id: 'owner' }, key: 'pharmacy', allowed: false }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }), authClient: { api: { get: mocks.get, post: mocks.post } } }));
vi.mock('../BusinessWorkspace', () => ({ useBusiness: () => ({ business: { key: mocks.key, policyScope: 'business:fixture', registrationConditions: '합성 참여 조건' }, access: { canManage: false, allowed: mocks.allowed } }) }));
import BusinessParticipationPage from '../BusinessParticipationPage';
const envelope = (data: unknown) => ({ data: { data } });
const stores = ['a', 'b'].map(key => ({ organizationId: `store-${key}`, organizationName: `합성 약국 ${key}`, memberRole: 'owner' }));
const policies = ['terms', 'privacy'].map((documentType, i) => ({ serviceKey: 'business:fixture', documentType, policyDocumentId: `22222222-2222-4222-8222-22222222222${i}`, version: 1, title: documentType, content: 'Fixture policy' }));
function Fixture() {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="url">{location.search}{location.hash}</output><button onClick={() => navigate('?store=store-b#status')}>외부 약국 이동</button><BusinessParticipationPage /></>;
}
function mount(search = '') { return render(<MemoryRouter initialEntries={['/my/participation' + search]}><Fixture /></MemoryRouter>); }
beforeEach(() => {
  mocks.user = { id: 'owner' }; mocks.key = 'pharmacy'; mocks.allowed = false; mocks.get.mockReset(); mocks.post.mockReset();
  mocks.get.mockImplementation(async (path: string, config?: { headers?: Record<string, string> }) => {
    if (path === '/work-scope/accessible-stores') return envelope({ stores });
    if (path.endsWith('/enrollment-policies')) return envelope(policies);
    if (path.endsWith('/semi-franchises')) return envelope([{ key: mocks.key, membershipStatus: config?.headers?.['X-Store-Organization-Id'] === 'store-a' ? 'active' : null }]);
    throw new Error('Unexpected fixture request');
  });
  mocks.post.mockResolvedValue(envelope({}));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('requires a choice for multiple pharmacies and never uses a default enrollment scope', async () => {
  mount(); await screen.findByRole('combobox', { name: '가입 상태를 확인할 약국' });
  expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/semi-franchises'))).toBe(false);
  expect(screen.queryByRole('button', { name: '참여 신청' })).toBeNull();
  expect(mocks.post).not.toHaveBeenCalled();
});
it.each(['pharmacy', 'megapharm'])('reads and applies only the selected pharmacy for %s, preserving query and hash', async key => {
  mocks.key = key; mount('?other=keep#status');
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'store-b' } });
  await screen.findByRole('button', { name: key === 'pharmacy' ? '기본 회원 연결 확인' : '참여 신청' });
  expect(mocks.get).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises', { params: undefined, headers: { 'X-Store-Organization-Id': 'store-b' } });
  for (const checkbox of screen.queryAllByRole('checkbox')) fireEvent.click(checkbox);
  let resolve!: (value: ReturnType<typeof envelope>) => void;
  mocks.post.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  fireEvent.click(screen.getByRole('button', { name: key === 'pharmacy' ? '기본 회원 연결 확인' : '참여 신청' }));
  if (key === 'pharmacy') { expect(mocks.post.mock.calls[0][1]).toEqual({}); expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/enrollment-policies'))).toBe(false); }
  expect(mocks.post.mock.calls[0][0]).toBe(`/neture/pharmacy/semi-franchises/${key}/apply`);
  expect(mocks.post.mock.calls[0][2]).toEqual({ headers: { 'X-Store-Organization-Id': 'store-b' } });
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
  expect(screen.getByTestId('url').textContent).toBe('?other=keep&store=store-b#status');
  await act(async () => resolve(envelope({})));
});
it('does not replace an invalid explicit pharmacy with the single available pharmacy', async () => {
  const initial = mocks.get.getMockImplementation()!;
  mocks.get.mockImplementation((path, config) => path === '/work-scope/accessible-stores' ? Promise.resolve(envelope({ stores: stores.slice(0, 1) })) : initial(path, config));
  mount('?store=unowned'); await screen.findByRole('combobox');
  expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/semi-franchises'))).toBe(false);
  expect(mocks.post).not.toHaveBeenCalled();
});
it('never presents pharmacy enrollment controls to a staff-only account', async () => {
  mocks.get.mockResolvedValue(envelope({ stores: [{ ...stores[0], memberRole: 'staff' }] }));
  mount(); await screen.findByText('가입 신청·탈퇴는 해당 약국의 경영 권한이 필요합니다.');
  expect(mocks.get.mock.calls).toHaveLength(1); expect(mocks.post).not.toHaveBeenCalled();
});
it('reports an inaccessible pharmacy list and recovers without claiming nonmembership', async () => {
  mocks.get.mockRejectedValueOnce(new Error('Unavailable'));
  mount(); await screen.findByRole('alert');
  expect(screen.queryByText('아직 참여 신청하지 않았습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '약국 목록 다시 확인' }));
  await screen.findByRole('combobox');
});
it('binds withdrawal to the selected pharmacy without writing when confirmation is cancelled', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  mount('?store=store-a'); fireEvent.click(await screen.findByRole('button', { name: '탈퇴' }));
  expect(mocks.post).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  mocks.post.mockRejectedValueOnce(new Error('Fixture write failure'));
  fireEvent.click(screen.getByRole('button', { name: '탈퇴' }));
  await screen.findByRole('alert');
  expect(mocks.post).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises/pharmacy/withdraw', {}, { headers: { 'X-Store-Organization-Id': 'store-a' } });
});
it('clears another pharmacy status and ignores its late enrollment response', async () => {
  const initial = mocks.get.getMockImplementation()!;
  let resolve!: (value: ReturnType<typeof envelope>) => void;
  mocks.get.mockImplementation((path, config) => path.endsWith('/semi-franchises') && config?.headers?.['X-Store-Organization-Id'] === 'store-a' ? new Promise(r => { resolve = r; }) : initial(path, config));
  mount('?store=store-a'); await waitFor(() => expect(resolve).toBeDefined());
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'store-b' } });
  await screen.findByText('Pharmacy 기본 회원 연결을 확인해 주세요.');
  await act(async () => resolve(envelope([{ key: 'pharmacy', membershipStatus: 'active' }])));
  expect(screen.queryByText('참여 중')).toBeNull();
});
it('clears consent and draft input when a different pharmacy is selected, even after an in-flight application', async () => {
  mocks.key = 'megapharm';
  const initial = mocks.get.getMockImplementation()!;
  mocks.get.mockImplementation((path, config) => path.endsWith('/semi-franchises') ? Promise.resolve(envelope([{ key: mocks.key, membershipStatus: null }])) : initial(path, config));
  let reject!: (reason: Error) => void;
  mocks.post.mockReturnValueOnce(new Promise((_resolve, r) => { reject = r; }));
  mount('?store=store-a'); await screen.findByText('privacy · 버전 1');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '이전 약국의 신청 내용' } });
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: '참여 신청' }));
  fireEvent.click(screen.getByRole('button', { name: '외부 약국 이동' }));
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises', { params: undefined, headers: { 'X-Store-Organization-Id': 'store-b' } }));
  await screen.findByText('privacy · 버전 1');
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  expect(screen.getAllByRole('checkbox').every(box => !(box as HTMLInputElement).checked)).toBe(true);
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false);
  await act(async () => reject(new Error('Old request')));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(mocks.post).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'store-a' } });
  await screen.findByText('privacy · 버전 1');
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false);
});
it('keeps enrollment disabled when the selected business policies are unavailable', async () => {
  mocks.key = 'megapharm';
  const initial = mocks.get.getMockImplementation()!;
  mocks.get.mockImplementation((path, config) => path.endsWith('/enrollment-policies') ? Promise.reject({ response: { status: 503, data: { code: 'POLICY_UNAVAILABLE' } } }) : initial(path, config));
  mount('?store=store-b'); await screen.findByRole('button', { name: '참여 신청' });
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  expect((screen.getByRole('button', { name: '참여 신청' }) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.post).not.toHaveBeenCalled();
});

it('preserves the selected pharmacy when entering the participant forum', async () => {
  mocks.allowed = true; mount('?store=store-a');
  expect((await screen.findByRole('link', { name: '참여자 게시판 이용하기 →' })).getAttribute('href')).toBe('/community?store=store-a');
});

it.each(['rejected', 'suspended', 'terminated'])('never offers automatic reconnection for an existing Pharmacy %s membership', async status => {
  const initial = mocks.get.getMockImplementation()!;
  mocks.get.mockImplementation((path, config) => path.endsWith('/semi-franchises') ? Promise.resolve(envelope([{ key: 'pharmacy', membershipStatus: status }])) : initial(path, config));
  mount('?store=store-b'); await screen.findByText(/기존 이용 정지·반려·탈퇴는 자동으로 해제되지 않습니다/);
  await waitFor(() => expect(screen.queryByText('가입 상태를 확인하고 있습니다…')).toBeNull());
  expect(screen.queryByRole('button', { name: '기본 회원 연결 확인' })).toBeNull();
  expect(screen.queryByRole('button', { name: '참여 신청' })).toBeNull();
  expect(mocks.post).not.toHaveBeenCalled();
});
