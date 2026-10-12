import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../lib/apiClient', () => ({ api }));
import { MyHomeStoreMembers } from './MyHomeStoreMembers';
const store = { organizationId: 'store-a', organizationName: '합성 매장 A', memberRole: 'owner' };
let invitations: Array<{ organizationId: string; organizationName: string; status: string }>;
let level: string;
let members: Array<{ userId: string; email: string; role: string; status: string }>;
const envelope = (data: unknown) => ({ data: { success: true, data } });
beforeEach(() => {
  vi.clearAllMocks(); invitations = []; level = 'owner';
  members = [{ userId: 'staff-a', email: 'fixture@example.test', role: 'accepted', status: 'accepted' }];
  api.get.mockImplementation(async (path: string, config?: { headers: Record<string, string> }) => {
    if (path === '/work-scope/accessible-stores') return envelope({ stores: [store] });
    if (path === '/store/invitations') return envelope(invitations);
    if (path === '/store/membership') return envelope({ level, organizationId: config?.headers['X-Store-Organization-Id'] });
    if (path === '/store/members') return envelope({ organizationId: config?.headers['X-Store-Organization-Id'], members });
    throw new Error(path);
  });
  api.post.mockResolvedValue(envelope({})); api.delete.mockResolvedValue(envelope({}));
});
afterEach(cleanup);
describe('My Home 직원 초대·최종 승인', () => {
  it('경영자는 승인 대기 직원을 선택 매장에서 최종 승인한다', async () => {
    const changed = vi.fn(); render(<MyHomeStoreMembers accountId="owner" onChanged={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: '최종 승인' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/store/members/staff-a/approve', {}, expect.objectContaining({ headers: { 'X-Store-Organization-Id': 'store-a' }, params: { serviceKey: 'kpa' } })));
    await waitFor(() => expect(changed).toHaveBeenCalled());
  });
  it('직원에게는 경영자의 초대·승인·해제 UI와 구성원 API를 제공하지 않는다', async () => {
    level = 'member'; render(<MyHomeStoreMembers accountId="staff" />);
    await screen.findByText('내 업무 바로가기에서 내 매장으로 이동할 수 있습니다.');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/store/membership', expect.anything()));
    expect(screen.queryByRole('button', { name: '직원 초대' })).toBeNull();
    expect(screen.queryByRole('button', { name: '최종 승인' })).toBeNull();
    expect(api.get.mock.calls.some(([path]) => path === '/store/members')).toBe(false);
  });
  it('수락 전에는 수락·거절을 표시하고 수락 후에는 승인 대기·취소를 표시한다', async () => {
    invitations = [{ organizationId: 'invited-store', organizationName: '초대 매장', status: 'invited' }];
    api.post.mockImplementation(async () => { invitations[0].status = 'accepted'; return envelope({}); });
    render(<MyHomeStoreMembers accountId="staff" />);
    fireEvent.click(await screen.findByRole('button', { name: '초대 수락' }));
    await screen.findByRole('button', { name: '수락 취소' });
    expect(screen.queryByRole('button', { name: '초대 수락' })).toBeNull();
    expect(screen.getByText(/초대 매장 · 경영자 승인 대기/)).toBeTruthy();
    expect(api.post.mock.calls[0][0]).toBe('/store/invitations/invited-store/accept');
  });
  it('접근 해제는 선택 매장과 대상 직원을 명시한다', async () => {
    members[0] = { ...members[0], role: 'staff', status: 'active' };
    render(<MyHomeStoreMembers accountId="owner" />);
    fireEvent.click(await screen.findByRole('button', { name: '접근 해제' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/store/members/staff-a', expect.objectContaining({ headers: { 'X-Store-Organization-Id': 'store-a' } })));
  });
  it('조회 실패는 오류·재시도를 제공한다', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    render(<MyHomeStoreMembers accountId="owner" />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByRole('button', { name: '최종 승인' });
  });
});
