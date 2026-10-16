import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), login: vi.fn(), authenticated: true, account: 'owner' }));
vi.mock('../../../contexts', () => ({
  useAuth: () => ({ user: state.authenticated ? { id: state.account } : null, isAuthenticated: state.authenticated }),
  useLoginModal: () => ({ openLoginModal: state.login }),
}));
vi.mock('../../../lib/apiClient', () => ({ api: { get: state.get, post: state.post } }));
import CarePharmHomePage from '../CarePharmHomePage';
const business = { key: 'carepharm', name: '만성질환관리', communityKey: 'business:carepharm', registrationConditions: '참여 조건' };
let access: { kind: string; businessKey: string; allowed: boolean; canManage: boolean };
let membership: string | null;
const response = (data: unknown) => ({ data: { data } });
const mount = (view: 'home' | 'participation' | 'materials' = 'home') => render(<MemoryRouter><CarePharmHomePage view={view} /></MemoryRouter>);
beforeEach(() => {
  state.get.mockReset(); state.post.mockReset(); state.login.mockReset(); state.authenticated = true; state.account = 'owner'; membership = null;
  access = { kind: 'semi-franchise', businessKey: 'carepharm', allowed: false, canManage: false };
  state.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/businesses/carepharm')) return response(business);
    if (path === '/communities/business%3Acarepharm/access') return response(access);
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
    expect(state.post).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises/carepharm/apply', { acceptedConditions: true, conditions: '참여 조건', note: '참여 신청' });
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
    expect(state.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'carepharm', page: 1, limit: 20 } });
    expect(screen.queryByRole('button', { name: /복사/ })).toBeNull();
  });
  it('does not display another model materials returned in an invalid response', async () => {
    access.allowed = true; state.get.mockImplementation(async (path: string) => response(path.endsWith('/businesses/carepharm') ? business : path.includes('/access') ? access : { items: [{ id: 'foreign', title: '다른 사업 자료', semiFranchiseKey: 'pharmacy' }], total: 1 }));
    mount('materials'); await screen.findByRole('alert'); expect(screen.queryByText('다른 사업 자료')).toBeNull();
  });
  it('gives the assigned operator the existing scoped management entry without loading store-owner resources', async () => {
    access.allowed = true; access.canManage = true; mount(); await screen.findByRole('link', { name: '참여 약국 · 공급 승인 · 콘텐츠 운영' });
    expect(state.get.mock.calls.some(([path]) => path.endsWith('/store/contents'))).toBe(false);
  });
  it('drops member resources immediately on account changes', async () => {
    access.allowed = true; const ui = mount(); await screen.findByText('혈당 관리 자료');
    state.authenticated = false; ui.rerender(<MemoryRouter><CarePharmHomePage /></MemoryRouter>);
    expect(screen.queryByText('혈당 관리 자료')).toBeNull(); expect(screen.getByRole('button', { name: '로그인하기' })).toBeTruthy();
  });
  it('reports an unavailable model as an error instead of registering or joining anything', async () => {
    state.get.mockRejectedValue(new Error('not registered')); mount(); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); await waitFor(() => expect(state.get).toHaveBeenCalledTimes(2));
    expect(state.post).not.toHaveBeenCalled();
  });
});
