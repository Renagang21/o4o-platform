import {centralMenusForRole} from '@o4o/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperatorsPage from '../pages/operators/OperatorsPage';
import OperatorInvitationsPanel from '../pages/operators/OperatorInvitationsPanel';
const h = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(async () => ({ data: { success: true } })),
  delete: vi.fn(async () => ({ data: { success: true } })),
  patch: vi.fn(async () => ({ data: { success: true } })),
}));
vi.mock('@o4o/auth-client', () => ({
  authClient: {
    api: { get: h.get, post: h.post, put: vi.fn(), delete: h.delete, patch: h.patch },
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

  it('shows Admin and Operator assignments without including individual branch operators', async () => {
    h.get.mockImplementation(async (path: string) => ({ data: path === '/admin/users'
      ? { success: true, users: [
        { id: 'admin-fixture', name: 'Partner Admin Fixture', roles: ['partner-support:admin', 'partner-support:operator', 'community:admin', 'kpa-branch:operator'], isActive: true },
        { id: 'operator-fixture', name: 'Operator Fixture', roles: ['partner-support:operator'], isActive: true },
      ] }
      : { data: [] } }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('Partner Admin Fixture')).toHaveLength(3));
    expect(screen.getByText('Operator Fixture')).toBeTruthy();
    expect(screen.queryByLabelText('Operator 권한 함께 보기')).toBeNull();
    expect(screen.queryByText('Operator 권한')).toBeNull();
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
  it('invites a central Operator with explicit menu delegation', async () => {
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
    fireEvent.click(screen.getByRole('radio', { name: /community:operator/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 메일 보내기' }));
    await waitFor(() =>
      expect(h.post).toHaveBeenCalledWith(
        '/admin/service-operator-invitations',
        {
          email: 'new@example.com',
          serviceKey: 'community',
          role: 'community:operator',
          centralDelegation: true,
          menuKeys: centralMenusForRole('community:operator').map(menu=>menu.key),
        },
      ),
    );
    expect(
      h.post.mock.calls.some(
        ([path]) => path === '/admin/operator-assignments',
      ),
    ).toBe(false);
  });
  it.each([true, false])('shows an Operator row after invitation refresh (accepted=%s)', async accepted => {
    h.get.mockImplementation(async (path: string) => ({ data: path === '/admin/users'
      ? { success: true, users: [{id:'operator-fixture',name:'Synthetic Operator',roles:['partner-support:operator'],isActive:true}] }
      : { data: path.includes('service-operator-invitations') && accepted ? [{id:'accepted',role:'partner-support:operator',purpose:'assignment',scope_type:'platform',accepted_user_id:'operator-fixture',target_user_id:null,invited_email:null,status:'accepted',expired:false,expires_at:'2026-11-01'}] : [] } }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await screen.findByRole('button', {name:'목록 새로고침'});
    fireEvent.click(screen.getByRole('button', {name:'Refresh'}));
    await waitFor(() => expect(h.get.mock.calls.filter(([path]) => path === '/admin/users').length).toBeGreaterThan(1));
    expect(await screen.findByText('Synthetic Operator')).toBeTruthy();
    expect(h.post).not.toHaveBeenCalled();
  });
  it('allows resending and cancelling direct Operator invitations', async () => {
    h.get.mockResolvedValue({data:{data:[{id:'legacy-direct',role:'lecture:operator',scope_type:'platform',scope_key:'o4o-direct',status:'pending',expired:false,expires_at:'2099-01-01'}]}});
    render(<OperatorInvitationsPanel version={0} onLoaded={vi.fn()} />);
    expect((await screen.findByRole('button',{name:'재발송'}) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'재발송'}));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith('/admin/service-operator-invitations/legacy-direct/resend'));
    await waitFor(() => expect((screen.getByRole('button',{name:'초대 취소'}) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button',{name:'초대 취소'}));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith('/admin/service-operator-invitations/legacy-direct/cancel'));
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


it('lets the root Admin change duties and revoke a central Operator assignment', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  let revoked = false;
  h.get.mockImplementation(async (path: string) => ({ data: path === '/admin/users'
    ? { success: true, users: revoked ? [] : [{id:userId,name:'Delegated Operator',email:'fixture@example.test',roles:['community:operator'],centralDelegationRoles:['community:operator'],isActive:true}] }
    : { data: path.endsWith('/menu-grants') ? {available:centralMenusForRole('community:operator'),menuKeys:centralMenusForRole('community:operator').map(menu=>menu.key),version:'fixture-version'} : [] } }));
  h.delete.mockImplementationOnce(async () => { revoked = true; return { data: { success: true } }; });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
  const row = (await screen.findByText('Delegated Operator')).closest('tr')!;
  fireEvent.click(within(row).getByRole('button', {name: '더보기'}));
  fireEvent.click(screen.getByText('위임 업무 설정'));
  const reason = await screen.findByLabelText('변경 사유');
  const duties = screen.getByText('위임할 운영 업무', {exact:true}).closest('fieldset')!;
  fireEvent.click(within(duties).getAllByRole('checkbox')[0]);
  fireEvent.change(reason, {target:{value:'합성 업무 범위 변경'}});
  fireEvent.click(screen.getByRole('button', {name:'업무 위임 저장'}));
  await waitFor(() => expect(h.patch).toHaveBeenCalledWith('/admin/service-operator-invitations/menu-grants', expect.objectContaining({userId,role:'community:operator',menuKeys:centralMenusForRole('community:operator').map(menu=>menu.key).slice(1),reason:'합성 업무 범위 변경',version:'fixture-version'})));
  await waitFor(() => expect(screen.queryByLabelText('변경 사유')).toBeNull());
  fireEvent.click(within(screen.getByText('Delegated Operator').closest('tr')!).getByRole('button', {name:'더보기'}));
  fireEvent.click(screen.getByText('권한 해제 (Operator)'));
  await waitFor(() => expect(h.delete).toHaveBeenCalledWith(`/admin/users/${userId}/role-assignments/community%3Aoperator`));
  await waitFor(() => expect(screen.queryByText('Delegated Operator')).toBeNull());
  confirm.mockRestore();
});
