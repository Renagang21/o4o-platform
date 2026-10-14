import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'fixture-user', name: 'Fixture', roles: [] }, isAuthenticated: true, isLoading: false }),
}));
vi.mock('../../../lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '../../../lib/apiClient';
import { ServiceApplyPanel } from '../ServiceApplyPanel';

const denied = (status = 403, code = 'ACCOUNT_ACCESS_RESTRICTED') => ({ response: { status, data: { success: false, code } } });
const self = (status = 'pending', accountAccess = 'restricted') => ({ data: { success: true, data: { user: { id: 'fixture-user', status, accountAccess, roles: [], scopes: [], permissions: [] } } } });
const normalEntry = { data: { data: { serviceStates: { supplier: { status: 'none', source: 'none' }, netureMain: { status: 'active', source: 'account_verification' } } } } };

function mount() {
  return render(<MemoryRouter><ServiceApplyPanel service="supplier" /></MemoryRouter>);
}

function deniedEntry(meResponse = self()) {
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === '/neture/home/entry') throw denied();
    if (url === '/auth/me') return meResponse as any;
    return { data: { data: [] } } as any;
  });
}

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  localStorage.setItem('o4o_accessToken', 'synthetic-local-fixture');
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('ServiceApplyPanel with the real service-state hook and restricted HTTP contract', () => {
  it('home entry 403 → allowed self read → account guidance without supplier state or handoff', async () => {
    deniedEntry();
    mount();
    expect(await screen.findByTestId('service-apply-supplier-account-restricted')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByText(/Neture 계정 확인이 필요/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Neture 공개 메인으로' }).getAttribute('href')).toBe('https://neture.co.kr/');
    expect(screen.queryByRole('button', { name: '대표 홈에서 계정 상태 확인' })).toBeNull();
    expect(screen.queryByTestId('service-apply-supplier-none')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('o4o_accessToken')).toBe('synthetic-local-fixture');
  });

  it.each([self('active', 'normal'), self('pending', 'normal'), { data: { data: {} } }])('unconfirmed self status remains a read error', async (meResponse) => {
    deniedEntry(meResponse as any);
    mount();
    expect(await screen.findByTestId('service-apply-supplier-error')).toBeTruthy();
    expect(screen.queryByTestId('service-apply-supplier-account-restricted')).toBeNull();
    expect(screen.queryByTestId('service-apply-supplier-none')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('self-read failure remains retryable without inferring membership', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/neture/home/entry') throw denied();
      if (url === '/auth/me') throw denied(500, 'SERVER_ERROR');
      return { data: { data: [] } } as any;
    });
    mount();
    expect(await screen.findByTestId('service-apply-supplier-error')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
    expect(screen.queryByTestId('service-apply-supplier-none')).toBeNull();
  });

  it.each([[403, 'NO_SUPPLIER'], [500, 'ACCOUNT_ACCESS_RESTRICTED']])('other failure %s/%s does not use the restricted fallback', async (status, code) => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/neture/home/entry') throw denied(status, code);
      return { data: { data: [] } } as any;
    });
    mount();
    expect(await screen.findByTestId('service-apply-supplier-error')).toBeTruthy();
    expect(api.get).not.toHaveBeenCalledWith('/auth/me');
  });

  it('retry reads the server again and clears the restricted view only after a normal entry response', async () => {
    let entryReads = 0;
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/neture/home/entry') {
        if (++entryReads === 1) throw denied();
        return normalEntry as any;
      }
      if (url === '/auth/me') return self() as any;
      return { data: { data: [] } } as any;
    });
    mount();
    await screen.findByTestId('service-apply-supplier-account-restricted');
    fireEvent.click(screen.getByRole('button', { name: '계정 상태 다시 확인' }));
    await screen.findByTestId('service-apply-supplier-none');
    expect(screen.queryByTestId('service-apply-supplier-account-restricted')).toBeNull();
    await waitFor(() => expect(entryReads).toBe(2));
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => url === '/auth/me')).toHaveLength(1);
    expect(api.post).not.toHaveBeenCalled();
  });
});
