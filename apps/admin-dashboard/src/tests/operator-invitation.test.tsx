import {centralMenusForRole} from '@o4o/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperatorsPage from '../pages/operators/OperatorsPage';
import OperatorInvitationsPanel from '../pages/operators/OperatorInvitationsPanel';
const h = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(async () => ({ data: { success: true } })),
}));
vi.mock('@o4o/auth-client', () => ({
  authClient: {
    api: { get: h.get, post: h.post, put: vi.fn(), delete: vi.fn() },
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('operator invitation admin UI', () => {
  it('does not let an older list response remove a newly accepted administrator', async () => {
    let finishInitial!: (value: unknown) => void;
    const initial = new Promise(resolve => { finishInitial = resolve; });
    let reads = 0;
    h.get.mockImplementation((path: string) => {
      if (path === '/admin/users') {
        if (++reads === 1) return initial;
        return Promise.resolve({ data: { success: true, users: [{ id: 'new-admin', name: 'Latest Accepted Admin', roles: ['partner-support:admin'], isActive: true }] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await waitFor(() => expect(reads).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Latest Accepted Admin')).toBeTruthy();
    await act(async () => finishInitial({ data: { success: true, users: [] } }));
    expect(screen.getByText('Latest Accepted Admin')).toBeTruthy();
  });

  it('shows direct Admin and Operator assignments while preserving historical rights', async () => {
    h.get.mockImplementation(async (path: string) => ({ data: path === '/admin/users'
      ? { success: true, users: [
        { id: 'admin-fixture', name: 'Partner Admin Fixture', roles: ['partner-support:admin'], isActive: true },
        { id: 'operator-fixture', name: 'Operator Fixture', roles: ['partner-support:operator'], isActive: true },
      ] }
      : { data: [] } }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    expect(await screen.findByText('Partner Admin Fixture')).toBeTruthy();
    expect(await screen.findByText('Operator Fixture')).toBeTruthy();
    expect(h.post).not.toHaveBeenCalled();
  });

  it('refreshes the assignments when an invitation-list refresh observes acceptance', async () => {
    let accepted = false;
    h.get.mockImplementation(async (path: string) => ({ data: path === '/admin/users'
      ? { success: true, users: accepted ? [{ id: 'new-admin', name: 'Accepted Partner Admin', roles: ['partner-support:admin'], isActive: true }] : [] }
      : { data: path.includes('service-operator-invitations') ? [{
        id: 'invitation-fixture', role: 'partner-support:admin', purpose: 'assignment',
        status: accepted ? 'accepted' : 'pending', expired: false,
        accepted_user_id: accepted ? 'new-admin' : null, target_user_id: null,
        invited_email: accepted ? null : 'invite@example.test', expires_at: '2099-01-01',
      }] : [] } }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await screen.findByText('확인 대기');
    expect(screen.queryByText('Accepted Partner Admin')).toBeNull();
    accepted = true;
    fireEvent.click(screen.getByRole('button', { name: '목록 새로고침' }));
    expect(await screen.findByText('Accepted Partner Admin')).toBeTruthy();
    expect(screen.getAllByText('확인·수락 완료').length).toBeGreaterThan(0);
    expect(h.post).not.toHaveBeenCalled();
  });

  it('invites an unregistered email without selecting or requiring a Google-linked user', async () => {
    h.get.mockImplementation(async (path: string) => ({
      data:
        path === '/admin/users' ? { success: true, users: [] } : { data: [] },
    }));
    const view = render(
      <MemoryRouter>
        <OperatorsPage />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: '서비스 담당자 지정' }),
    );
    fireEvent.change(screen.getByLabelText('미가입자 초대 이메일'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(
      view.container.querySelector(
        'input[name="target-service"][value="community"]',
      )!,
    );
    expect(screen.getByRole('radio', { name: /community:operator/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /community:admin/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 메일 보내기' }));
    await waitFor(() =>
      expect(h.post).toHaveBeenCalledWith(
        '/admin/service-operator-invitations',
        {
          email: 'new@example.com',
          serviceKey: 'community',
          role: 'community:admin',
          centralDelegation: true,
          menuKeys: centralMenusForRole('community:admin').map(menu=>menu.key),
        },
      ),
    );
    expect(
      h.post.mock.calls.some(
        ([path]) => path === '/admin/operator-assignments',
      ),
    ).toBe(false);
  });
  it.each([true, false])('shows Operator consent or preserved rights in the central read-only list (accepted=%s)', async accepted => {
    h.get.mockImplementation(async (path: string) => ({ data: path === '/admin/users'
      ? { success: true, users: [{id:'operator-fixture',name:'Synthetic Operator',email:'operator@example.test',roles:['partner-support:operator'],isActive:true}] }
      : { data: path.includes('service-operator-invitations') && accepted ? [{id:'accepted',role:'partner-support:operator',purpose:'assignment',scope_type:'service',accepted_user_id:'operator-fixture',target_user_id:null,invited_email:null,status:'accepted',expired:false,expires_at:'2026-11-01'}] : [] } }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    expect((await screen.findByLabelText('Operator 권한 함께 보기') as HTMLInputElement).checked).toBe(true);
    expect(await screen.findByText(accepted ? '확인 완료' : '기존 권한 유지')).toBeTruthy();
    expect(screen.queryByText('대상 아님')).toBeNull();
  });
  it('distinguishes confirmation pending, accepted and expired and offers resend/cancel', async () => {
    const base = {
      role: 'lecture:operator',
      purpose: 'confirmation',
      expires_at: '2026-10-22T00:00:00Z',
      target_user_id: 'u1',
      accepted_user_id: null,
    };
    h.get.mockResolvedValue({
      data: {
        data: [
          {
            ...base,
            id: 'a',
            invited_email: 'pending@example.com',
            status: 'pending',
            expired: false,
          },
          {
            ...base,
            id: 'b',
            invited_email: 'done@example.com',
            status: 'accepted',
            expired: false,
          },
          {
            ...base,
            id: 'c',
            invited_email: 'expired@example.com',
            status: 'pending',
            expired: true,
          },
        ],
      },
    });
    const onLoaded = vi.fn();
    render(<OperatorInvitationsPanel version={0} onLoaded={onLoaded} />);
    await screen.findByText('pending@example.com');
    expect(screen.getByText('확인 대기')).toBeTruthy();
    expect(screen.getByText('확인·수락 완료')).toBeTruthy();
    expect(screen.getByText('만료')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '재발송' })[0]);
    await waitFor(() =>
      expect(h.post).toHaveBeenCalledWith(
        '/admin/service-operator-invitations/a/resend',
      ),
    );
  });
});
