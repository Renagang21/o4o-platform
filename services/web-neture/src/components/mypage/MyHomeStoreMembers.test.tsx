import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
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
    if (path === '/neture/pharmacy/service-features') return envelope({ organizationId: config?.headers['X-Store-Organization-Id'], features: [{ key: 'tablet', label: '태블릿', allowed: true }, { key: 'multilingual-content', label: '다국어 상품 콘텐츠', allowed: false }, { key: 'store-staff-support', label: '매장 직원 지원', allowed: false }] });
    throw new Error(path);
  });
  api.post.mockResolvedValue(envelope({})); api.put.mockResolvedValue(envelope({})); api.delete.mockResolvedValue(envelope({}));
});
afterEach(cleanup);
describe('My Home 직원 초대·최종 승인', () => {
  it('모아보기에서는 초대를 유지하고 구성원 조회는 직원 관리를 펼칠 때만 실행한다', async () => {
    render(<MyHomeStoreMembers accountId="owner" compact />);
    const toggle = await screen.findByRole('button', { name: '매장 직원 관리 펼치기' });
    expect(screen.queryByRole('textbox', { name: '직원 이메일' })).toBeNull();
    expect(api.get.mock.calls.some(([path]) => path === '/store/members' || path === '/store/membership')).toBe(false);
    fireEvent.click(toggle);
    expect(await screen.findByRole('button', { name: '최종 승인' })).toBeTruthy();
    expect(api.get.mock.calls.filter(([path]) => path === '/store/members')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '직원 관리 접기' }));
    expect(screen.queryByRole('button', { name: '최종 승인' })).toBeNull();
  });
  it('매장이 없는 직원도 초대를 바로 수락할 수 있다', async () => {
    invitations = [{ organizationId: 'invite-only', organizationName: '합성 초대 매장', status: 'invited' }];
    api.get.mockImplementation(async (path: string) => path === '/work-scope/accessible-stores' ? envelope({ stores: [] }) : envelope(invitations));
    render(<MyHomeStoreMembers accountId="invite-only" compact />);
    fireEvent.click(await screen.findByRole('button', { name: '초대 수락' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/store/invitations/invite-only/accept', {}, expect.anything()));
    expect(screen.queryByRole('button', { name: '매장 직원 관리 펼치기' })).toBeNull();
  });
  it('매장 전환 시 이전 구성원 조회의 늦은 응답을 버린다', async () => {
    let finish!: (value: unknown) => void;
    const original = api.get.getMockImplementation()!;
    api.get.mockImplementation((path: string, config?: { headers: Record<string, string> }) => {
      if (path === '/work-scope/accessible-stores') return Promise.resolve(envelope({ stores: [store, { ...store, organizationId: 'store-b', organizationName: '합성 매장 B' }] }));
      if (path === '/store/members' && config?.headers['X-Store-Organization-Id'] === 'store-a') return new Promise(r => { finish = r; });
      if (path === '/store/members') return Promise.resolve(envelope({ organizationId: 'store-b', members: [] }));
      return original(path, config);
    });
    render(<MyHomeStoreMembers accountId="owner" />);
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'store-b' } });
    finish(envelope({ organizationId: 'store-a', members }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/store/members', expect.objectContaining({ headers: { 'X-Store-Organization-Id': 'store-b' } })));
    expect(screen.queryByRole('button', { name: '최종 승인' })).toBeNull();
  });
  it('경영자는 승인 대기 직원을 선택 매장에서 최종 승인한다', async () => {
    const changed = vi.fn(); render(<MyHomeStoreMembers accountId="owner" onChanged={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: '최종 승인' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/store/members/staff-a/approve', { serviceFeatures: ['tablet'] }, expect.objectContaining({ headers: { 'X-Store-Organization-Id': 'store-a' }, params: { serviceKey: 'kpa' } })));
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
  it('직원에게 허용할 기능을 선택해서 승인하고, 약국 미제공 기능은 선택할 수 없다', async () => {
    render(<MyHomeStoreMembers accountId="owner" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: '태블릿' }));
    expect(screen.queryByRole('checkbox', { name: '매장 직원 지원' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '최종 승인' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/store/members/staff-a/approve', { serviceFeatures: [] }, expect.anything()));
  });
  it('기능 조회 실패 시 승인을 진행하지 않고 기존 직원 접근 해제는 유지한다', async () => {
    members[0] = { ...members[0], role: 'staff', status: 'active' };
    const original = api.get.getMockImplementation()!;
    api.get.mockImplementation((path: string, config?: { headers: Record<string, string> }) => path.endsWith('/service-features') ? Promise.reject(new Error('offline')) : original(path, config));
    render(<MyHomeStoreMembers accountId="owner" />);
    await screen.findByRole('button', { name: '기능 다시 확인' });
    expect(screen.queryByRole('button', { name: '이용 기능 저장' })).toBeNull();
    expect(screen.getByRole('button', { name: '접근 해제' })).toBeTruthy();
  });
  it('승인된 직원의 기능을 선택 매장에 저장한다', async () => {
    members[0] = { ...members[0], role: 'staff', status: 'active' };
    render(<MyHomeStoreMembers accountId="owner" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: '태블릿' }));
    fireEvent.click(screen.getByRole('button', { name: '이용 기능 저장' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/neture/pharmacy/staff-feature-permissions/staff-a', { serviceFeatures: [] }, expect.objectContaining({ headers: { 'X-Store-Organization-Id': 'store-a' } })));
  });
});
