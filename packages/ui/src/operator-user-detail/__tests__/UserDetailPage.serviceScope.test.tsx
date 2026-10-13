import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor, fireEvent, screen } from '@testing-library/react';
import UserDetailPage from '../UserDetailPage';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('member detail service boundary', () => {
  it.each(['neture', 'kpa-society', 'pharmacy-hub'])('sends selected service %s and refreshes when selection changes', async (serviceKey) => {
    const get = vi.fn(async (path: string) => { void path; return ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [] }); });
    const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
    const config: any = { theme: 'blue', serviceKey };
    const props = { userId: 'u', apiAdapter: api, isAdmin: false, navigate: vi.fn() };
    const view = render(<UserDetailPage {...props} config={config} />);
    await waitFor(() => expect(get).toHaveBeenCalledWith(`/operator/members/u?serviceKey=${serviceKey}`));
    await waitFor(() => expect(screen.getByText('정보 수정')).toBeTruthy());
    fireEvent.click(screen.getByText('정보 수정'));
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path === `/operator/members/u?serviceKey=${serviceKey}`)).toHaveLength(2));
    view.rerender(<UserDetailPage {...props} config={{ ...config, serviceKey: 'lecture' }} />);
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path === '/operator/members/u?serviceKey=lecture')).toHaveLength(2));
  });
});

it('central detail and its editor explicitly request the platform all-services view', async () => {
  const get = vi.fn(async (path: string) => { void path; return ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [] }); });
  const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
  render(<UserDetailPage userId="u" apiAdapter={api} isAdmin={true} navigate={vi.fn()} config={{ theme: 'blue' } as any} />);
  await waitFor(() => expect(screen.getByText('정보 수정')).toBeTruthy());
  fireEvent.click(screen.getByText('정보 수정'));
  await waitFor(() => expect(get.mock.calls.filter(([path]) => path === '/operator/members/u?all=true')).toHaveLength(2));
});


it.each(['active', 'suspended', 'pending'])('operator preserves profile editing and application decisions without admin lifecycle controls (%s)', async status => {
  const get = vi.fn(async () => ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [{ id: 'membership', serviceKey: 'neture', status, role: 'member', createdAt: '2026-01-01' }] }));
  const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
  render(<UserDetailPage userId="u" apiAdapter={api} isAdmin={false} navigate={vi.fn()} config={{ theme: 'blue', serviceKey: 'neture' } as any} />);
  await waitFor(() => expect(screen.getByText('정보 수정')).toBeTruthy());
  expect(screen.queryByRole('button', { name: '정지' })).toBeNull();
  expect(screen.queryByRole('button', { name: '복구' })).toBeNull();
  expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  if (status === 'pending') {
    expect(screen.getByTitle('멤버십 승인')).toBeTruthy();
    expect(screen.getByTitle('멤버십 거부')).toBeTruthy();
  } else expect(screen.queryByTitle('멤버십 거부')).toBeNull();
});

it.each([['active', '정지'], ['suspended', '복구']])('service admin can manage membership lifecycle (%s)', async (status, action) => {
  const get = vi.fn(async () => ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [{ id: 'membership', serviceKey: 'neture', status, role: 'member', createdAt: '2026-01-01' }] }));
  const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
  render(<UserDetailPage userId="u" apiAdapter={api} isAdmin={true} navigate={vi.fn()} config={{ theme: 'blue', serviceKey: 'neture' } as any} />);
  await waitFor(() => expect(screen.getByRole('button', { name: action })).toBeTruthy());
  expect(screen.getByRole('button', { name: '서비스 탈퇴' })).toBeTruthy();
});

const activeServices = ['neture', 'kpa-society', 'lecture', 'community', 'supplier', 'funding'];
function memberFixture(serviceKey: string, status: string) {
  const get = vi.fn(async () => ({ user: { id: 'u', name: '샘플 회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [{ id: 'membership', serviceKey, status, role: 'member', createdAt: '2026-01-01' }] }));
  return { get, put: vi.fn(), patch: vi.fn(async () => ({})), post: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) };
}

it.each(activeServices)('%s reserves withdrawn restoration and service termination for admin with explicit service scope', async serviceKey => {
  const api = memberFixture(serviceKey, 'withdrawn'), navigate = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const props = { userId: 'u', apiAdapter: api, canManageMembers: true, navigate,
    config: { theme: 'blue' as const, serviceKey, labels: { businessInfoTitle: '사업자 정보', businessNameLabel: '사업자명' } } };
  const view = render(<UserDetailPage {...props} isAdmin={false} />);
  await screen.findByText('정보 수정');
  expect(screen.getByText('공통 계정 상태').closest('tr')?.textContent).toContain('활성');
  expect(screen.getByText('서비스 가입 상태').closest('tr')?.textContent).toContain('탈퇴');
  expect(screen.queryByRole('button', { name: '탈퇴 회원 복구' })).toBeNull();
  expect(screen.queryByRole('button', { name: '서비스 탈퇴' })).toBeNull();
  view.rerender(<UserDetailPage {...props} isAdmin />);
  fireEvent.click(screen.getByRole('button', { name: '탈퇴 회원 복구' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/operator/members/u/reactivate', { serviceKey }));
  fireEvent.click(screen.getByRole('button', { name: '서비스 탈퇴' }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`/operator/members/u?serviceKey=${encodeURIComponent(serviceKey)}`));
  expect(confirm.mock.calls.at(-1)?.[0]).toContain('공통 계정과 다른 서비스 가입은 유지됩니다.');
  expect(navigate).toHaveBeenCalled();
});

it.each([null, ''])('membership rejection respects cancellation and optional empty reasons (%s)', async reason => {
  const api = memberFixture('lecture', 'pending');
  vi.spyOn(window, 'prompt').mockReturnValue(reason);
  render(<UserDetailPage userId="u" apiAdapter={api} isAdmin={false} canManageMembers navigate={vi.fn()} config={{ theme: 'blue', serviceKey: 'lecture', labels: { businessInfoTitle: '사업자 정보', businessNameLabel: '사업자명' } }} />);
  await screen.findByTitle('멤버십 거부');
  fireEvent.click(screen.getByTitle('멤버십 거부'));
  if (reason === null) expect(api.patch).not.toHaveBeenCalled();
  else await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/operator/members/membership/reject', { reason: '' }));
});


it.each([['active', '정지'], ['suspended', '복구']])('operator daily authority performs %s without exposing deletion or operator assignment', async (status, action) => {
  const get = vi.fn(async (path: string) => path.startsWith('/operator/roles') ? { data: [
    { name: 'neture:member', displayName: '일반 회원', isAssignable: true, isAdminRole: false },
    { name: 'neture:operator', displayName: '서비스 운영자', isAssignable: true, isAdminRole: false },
  ] } : { user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [{ id: 'membership', serviceKey: 'neture', status, role: 'member', createdAt: '2026-01-01' }] });
  const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
  render(<UserDetailPage userId="u" apiAdapter={api} isAdmin={false} canManageMembers navigate={vi.fn()} config={{ theme: 'blue', serviceKey: 'neture', labels: { businessInfoTitle: '사업자 정보', businessNameLabel: '사업자명' } }} />);
  await waitFor(() => expect(screen.getByRole('button', { name: action })).toBeTruthy());
  expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '역할 추가' }));
  await waitFor(() => expect(get).toHaveBeenCalledWith('/operator/roles?service=neture'));
  expect(screen.queryByRole('option', { name: '서비스 운영자' })).toBeNull();
  expect(screen.getByRole('option', { name: '일반 회원' })).toBeTruthy();
});
