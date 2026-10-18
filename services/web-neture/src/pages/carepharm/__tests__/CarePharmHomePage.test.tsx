import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), login: vi.fn(), authenticated: true, account: 'owner' }));
vi.mock('../../../contexts', () => ({
  useAuth: () => ({ user: state.authenticated ? { id: state.account } : null, isAuthenticated: state.authenticated }),
  useLoginModal: () => ({ openLoginModal: state.login }),
}));
vi.mock('../../../lib/apiClient', () => ({ api: { get: state.get, post: state.post } }));
vi.mock('@o4o/shared-space-ui', async original => ({ ...await original<typeof import('@o4o/shared-space-ui')>(), ServiceHomeHero: () => <h1>만성질환관리</h1>, ServiceHomePromotion: () => null }));
import CarePharmHomePage from '../CarePharmHomePage';
const business = { key: 'carepharm', name: '만성질환관리', communityKey: 'business:carepharm', registrationConditions: '참여 조건' };
let access: { kind: string; businessKey: string; allowed: boolean; canManage: boolean };
let membership: string | null;
const response = (data: unknown) => ({ data: { data } });
const mount = (view: 'home' | 'participation' | 'materials' | 'tools' = 'home') => render(<MemoryRouter><CarePharmHomePage view={view} /></MemoryRouter>);
beforeEach(() => {
  state.get.mockReset(); state.post.mockReset(); state.login.mockReset(); state.authenticated = true; state.account = 'owner'; membership = null;
  access = { kind: 'semi-franchise', businessKey: 'carepharm', allowed: false, canManage: false };
  state.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/businesses/carepharm/store-access')) return response({ businessKey: 'carepharm', organizationId: 'owned-store', allowed: access.allowed, membershipStatus: access.allowed ? 'active' : membership });
    if (path.endsWith('/businesses/carepharm')) return response(business);
    if (path === '/communities/business%3Acarepharm/access') return response(access);
    if (path === '/work-scope/accessible-stores') return response({ stores: [{ organizationId: 'owned-store', organizationName: '선택 약국', memberRole: 'owner' }] });
    if (path.endsWith('/semi-franchises')) return response([{ key: 'pharmacy', membershipStatus: 'active' }, { key: 'carepharm', membershipStatus: membership }]);
    if (path.endsWith('/store/contents')) return response({ items: [{ id: 'material', title: '혈당 관리 자료', body: '<p>자료 본문</p>', semiFranchiseKey: 'carepharm' }], total: 1 });
    throw new Error(`Unexpected path: ${path}`);
  });
});
afterEach(cleanup);
describe('CarePharm cooperation service', () => {
  it('asks signed-out users to log in without reading protected business data', () => {
    state.authenticated = false; mount(); fireEvent.click(screen.getByRole('button', { name: '로그인하기' }));
    expect(state.login).toHaveBeenCalledWith('/'); expect(state.get).not.toHaveBeenCalled();
  });
  it('does not infer CarePharm approval from pharmacy membership or an independent community', async () => {
    mount(); await screen.findByText(/이 서비스의 가입 승인 후/);
    expect(state.get).toHaveBeenCalledWith('/communities/business%3Acarepharm/access');
    expect(state.get.mock.calls.some(([path]) => path.includes('/store/contents') || path === '/communities')).toBe(false);
  });
  it.each(['pending', 'suspended', 'rejected'])('keeps %s applicants outside member resources', async status => {
    membership = status; mount(); await screen.findByText(/이 서비스의 가입 승인 후/);
    expect(screen.queryByRole('button', { name: '내 약국으로' })).toBeNull();
  });
  it('shows pending status with no duplicate application action', async () => {
    membership = 'pending'; mount('participation'); await screen.findByText('승인 대기');
    expect(screen.queryByRole('button', { name: '가입 신청' })).toBeNull();
  });
  it('submits only this model with the accepted current conditions and reloads approval state', async () => {
    state.post.mockImplementation(async () => { membership = 'pending'; return response({}); });
    mount('participation'); await screen.findByText('미가입');
    expect(screen.getByRole('button', { name: '가입 신청' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.change(screen.getByRole('textbox'), { target: { value: '참여 신청' } });
    fireEvent.click(screen.getByRole('button', { name: '가입 신청' }));
    await screen.findByText('승인 대기');
    expect(state.post).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises/carepharm/apply', { acceptedConditions: true, conditions: '참여 조건', note: '참여 신청' }, { headers: { 'X-Store-Organization-Id': 'owned-store' } });
  });
  it('requires fresh condition acceptance after server rejects stale conditions', async () => {
    state.post.mockRejectedValue({ response: { data: { code: 'CONDITIONS_CHANGED' } } });
    mount('participation'); await screen.findByText('미가입'); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '가입 신청' })); await screen.findByRole('alert');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('button', { name: '가입 신청' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '최신 참여 조건 다시 확인' })).toBeTruthy();
  });
  it('rejects a different business or independent community access response', async () => {
    access = { ...access, kind: 'independent', allowed: true }; mount(); await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: '내 약국으로' })).toBeNull();
  });
  it('only loads this model materials after approval', async () => {
    access.allowed = true; mount('materials'); await screen.findByText('혈당 관리 자료');
    expect(state.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'carepharm', page: 1, limit: 20 }, headers: { 'X-Store-Organization-Id': 'owned-store' } });
    expect(screen.queryByRole('button', { name: /복사/ })).toBeNull();
  });
  it('does not display another model materials returned in an invalid response', async () => {
    access.allowed = true; const previous = state.get.getMockImplementation()!;
    state.get.mockImplementation((path: string, config?: unknown) => path.endsWith('/store/contents') ? Promise.resolve(response({ items: [{ id: 'foreign', title: '다른 사업 자료', semiFranchiseKey: 'pharmacy' }], total: 1 })) : previous(path, config));
    mount('materials'); await screen.findByRole('alert'); expect(screen.queryByText('다른 사업 자료')).toBeNull();
  });
  it('gives the assigned operator the existing scoped management entry without loading store-owner resources', async () => {
    access.allowed = true; access.canManage = true; mount(); await screen.findByRole('link', { name: '참여 약국 · 공급 승인 · 콘텐츠 운영' });
    expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
  });
  it('drops member resources immediately on account changes', async () => {
    access.allowed = true; const ui = mount(); await screen.findByRole('link', { name: '자료실 보기' });
    state.authenticated = false; ui.rerender(<MemoryRouter><CarePharmHomePage /></MemoryRouter>);
    expect(screen.queryByText('혈당 관리 자료')).toBeNull(); expect(screen.getByRole('button', { name: '로그인하기' })).toBeTruthy();
  });
  it('retries transport failures without registering or joining anything', async () => {
    state.get.mockRejectedValue(new Error('not registered')); mount(); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); await waitFor(() => expect(state.get).toHaveBeenCalledTimes(2));
    expect(state.post).not.toHaveBeenCalled();
  });
});

it('does not pick an arbitrary pharmacy when the owner has multiple stores', async () => {
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: unknown) => path === '/work-scope/accessible-stores' ? Promise.resolve(response({ stores: [
    { organizationId: 'store-a', organizationName: '약국 A', memberRole: 'owner' },
    { organizationId: 'store-b', organizationName: '약국 B', memberRole: 'owner' },
  ] })) : previous(path, config));
  mount('participation'); await screen.findByText('가입 상태를 확인할 약국을 선택해 주세요.');
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/semi-franchises'))).toBe(false);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'store-b' } });
  await screen.findByText('미가입');
  expect(state.get).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises', { headers: { 'X-Store-Organization-Id': 'store-b' } });
});
it('never replaces an invalid explicit pharmacy with the first accessible one', async () => {
  access.allowed = true;
  render(<MemoryRouter initialEntries={['/materials?store=foreign']}><CarePharmHomePage view="materials" /></MemoryRouter>);
  await screen.findByText('회원 업무를 이용할 약국을 선택해 주세요.');
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
});

it.each([null, 'pending', 'rejected', 'suspended', 'terminated'])('does not use another pharmacy approval for selected membership %s', async status => {
  access.allowed = true;
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: unknown) => path.endsWith('/store-access') ? Promise.resolve(response({ businessKey: 'carepharm', organizationId: 'owned-store', allowed: false, membershipStatus: status })) : previous(path, config));
  mount('tools'); await screen.findByText(/이 서비스의 가입 승인 후/);
  expect(screen.queryByRole('button', { name: '내 약국으로' })).toBeNull();
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
});
it('keeps resources hidden while the selected pharmacy check is pending and rejects a mismatched reply', async () => {
  access.allowed = true;
  let finish!: (value: unknown) => void;
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: unknown) => path.endsWith('/store-access') ? new Promise(resolve => { finish = resolve; }) : previous(path, config));
  mount('materials'); await waitFor(() => expect(finish).toBeTypeOf('function'));
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
  finish(response({ businessKey: 'carepharm', organizationId: 'other-store', allowed: true }));
  await screen.findByRole('alert');
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
});
it('ignores a late approved response after changing to an unapproved pharmacy', async () => {
  access.allowed = true;
  let finish!: (value: unknown) => void;
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: any) => {
    if (path === '/work-scope/accessible-stores') return Promise.resolve(response({ stores: ['a', 'b'].map(id => ({ organizationId: id, organizationName: id, memberRole: 'owner' })) }));
    if (path.endsWith('/store-access')) return config.headers['X-Store-Organization-Id'] === 'a' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(response({ businessKey: 'carepharm', organizationId: 'b', allowed: false, membershipStatus: 'pending' }));
    return previous(path, config);
  });
  mount('materials'); await screen.findByRole('combobox');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } });
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
  await screen.findByText(/이 서비스의 가입 승인 후/);
  finish(response({ businessKey: 'carepharm', organizationId: 'a', allowed: true, membershipStatus: 'active' }));
  await waitFor(() => expect(screen.queryByText('혈당 관리 자료')).toBeNull());
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
});
it('drops an old account gate response when another account signs in', async () => {
  access.allowed = true;
  let finish!: (value: unknown) => void;
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: unknown) => {
    if (path.endsWith('/store-access')) return state.account === 'owner' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(response({ businessKey: 'carepharm', organizationId: 'owned-store', allowed: false, membershipStatus: null }));
    return previous(path, config);
  });
  const ui = mount('materials'); await waitFor(() => expect(finish).toBeTypeOf('function'));
  state.account = 'other-account'; ui.rerender(<MemoryRouter><CarePharmHomePage view="materials" /></MemoryRouter>);
  await screen.findByText(/이 서비스의 가입 승인 후/);
  finish(response({ businessKey: 'carepharm', organizationId: 'owned-store', allowed: true, membershipStatus: 'active' }));
  await waitFor(() => expect(screen.queryByText('혈당 관리 자료')).toBeNull());
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
});


it('keeps the public homepage when the real server reports no active business, without retrying or creating one', async () => {
  state.get.mockRejectedValue({ response: { status: 404, data: { code: 'BUSINESS_NOT_FOUND' } } });
  mount();
  await screen.findByText(/회원 서비스가 아직 개설되지/);
  expect(screen.getByRole('heading', { name: '함께 나누고, 내 약국에서 활용합니다' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '공지·안내' })).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  expect(screen.queryByText('Study 교육으로 이동')).toBeNull();
  expect(screen.queryByRole('navigation', { name: '협력사업 서비스' })).toBeNull();
  expect(state.post).not.toHaveBeenCalled();
});
it('distinguishes a missing member space from a network failure', async () => {
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: unknown) => path.includes('/communities/')
    ? Promise.reject({ response: { status: 404, data: { code: 'COMMUNITY_NOT_FOUND' } } }) : previous(path, config));
  mount(); await screen.findByText(/회원 공간이 아직 개설되지/);
  expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
});
it('offers login again for an expired session while retaining the introduction', async () => {
  state.get.mockRejectedValue({ response: { status: 401, data: {} } });
  mount(); fireEvent.click(await screen.findByRole('button', { name: '다시 로그인' }));
  expect(state.login).toHaveBeenCalledWith('/');
  expect(screen.getByRole('heading', { name: '함께 나누고, 내 약국에서 활용합니다' })).toBeTruthy();
});
it('identifies a forbidden pharmacy-list request and does not load protected materials', async () => {
  const previous = state.get.getMockImplementation()!;
  state.get.mockImplementation((path: string, config?: unknown) => path === '/work-scope/accessible-stores'
    ? Promise.reject({ response: { status: 403, data: {} } }) : previous(path, config));
  mount(); expect((await screen.findByRole('alert')).textContent).toContain('소속 약국 목록에 접근할 수 없습니다');
  expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
});
it('keeps home as an overview and loads member material bodies only in the material workspace', async () => {
  access.allowed = true; mount(); await screen.findByRole('link', { name: '자료실 보기' });
  expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
  expect(screen.getByRole('link', { name: '내 매장 업무 안내' }).getAttribute('href')).toBe('/tools?store=owned-store');
});
