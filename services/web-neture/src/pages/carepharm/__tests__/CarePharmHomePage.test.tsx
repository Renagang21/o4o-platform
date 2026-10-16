import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ get: vi.fn(), login: vi.fn(), authenticated: false }));
vi.mock('../../../contexts', () => ({
  useAuth: () => ({ user: state.authenticated ? { id: 'member' } : null, isAuthenticated: state.authenticated }),
  useLoginModal: () => ({ openLoginModal: state.login }),
}));
vi.mock('../../../lib/apiClient', () => ({ api: { get: (url: string) => url.startsWith('/home-presentation/') ? Promise.resolve({ data: { success: true, data: null } }) : state.get(url) } }));
import CarePharmHomePage from '../CarePharmHomePage';

const group = { communityKey: 'carepharm', kind: 'independent', allowed: false, membershipStatus: null };
const response = (communities: unknown[]) => ({ data: { data: { communities } } });
const mount = () => render(<MemoryRouter><CarePharmHomePage /></MemoryRouter>);
beforeEach(() => { state.get.mockReset(); state.login.mockReset(); state.authenticated = false; });
afterEach(cleanup);

describe('CarePharm existing-community entry', () => {
  it('does not offer an unregistered group or substitute another community', async () => {
    state.get.mockResolvedValue(response([{ ...group, communityKey: 'pharmacy' }]));
    mount();
    await screen.findByText(/모임 참여 안내를 준비하고 있습니다/);
    expect(screen.queryByRole('link', { name: '참여 안내 보기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '로그인하기' }));
    expect(state.login).toHaveBeenCalledWith('/');
  });

  it('preserves the shared forum access check and public-read entry', async () => {
    state.get.mockResolvedValue(response([group]));
    mount();
    expect((await screen.findByRole('link', { name: '참여 안내 보기' })).getAttribute('href')).toBe('/communities/carepharm/forum');
    expect(screen.getByRole('link', { name: '공개 소식 보기' }).getAttribute('href')).toBe('/communities/carepharm/public');
  });

  it('uses current membership without granting operator access', async () => {
    state.authenticated = true;
    state.get.mockResolvedValue(response([{ ...group, allowed: true }]));
    mount();
    await screen.findByRole('link', { name: '모임 공간으로' });
    expect(screen.queryByRole('button', { name: '로그인하기' })).toBeNull();
    expect(screen.queryByRole('link', { name: /운영/ })).toBeNull();
  });

  it('does not confuse a pending application with membership', async () => {
    state.get.mockResolvedValue(response([{ ...group, membershipStatus: 'pending' }]));
    mount();
    await screen.findByText(/승인 후 회원 활동/);
    expect(screen.queryByRole('link', { name: '모임 공간으로' })).toBeNull();
  });

  it('does not alias a business forum to an independent community', async () => {
    state.get.mockResolvedValue(response([{ ...group, kind: 'semi-franchise' }]));
    mount();
    await screen.findByText(/모임 참여 안내를 준비하고 있습니다/);
  });

  it('shows lookup errors and retries without pretending no group exists', async () => {
    state.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response([group]));
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByText(/모임 참여 안내를 준비/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByRole('link', { name: '참여 안내 보기' });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(state.get).toHaveBeenCalledTimes(2);
  });
});
