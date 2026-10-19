import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ nav: vi.fn<(options: unknown) => []>(() => []), user: { id: 'member', roles: ['kpa:pharmacist'], isStoreOwner: true } as { id: string; roles: string[]; isStoreOwner: boolean } | null }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ user: mocks.user, logout: vi.fn(), isLoading: false }) }));
vi.mock('../../contexts/AuthContext', () => ({ authClient: { api: { get: vi.fn() } } }));
vi.mock('../../contexts/LoginModalContext', () => ({ useAuthModal: () => ({ openLoginModal: vi.fn(), openRegisterModal: vi.fn() }) }));
vi.mock('../../api/credit', () => ({ creditApi: { getMyBalance: vi.fn(async () => ({ data: { balance: 0 } })) } }));
vi.mock('../../api/notifications', () => ({ notificationsApi: {} }));
vi.mock('@o4o/account-ui', () => ({ NotificationBell: () => null, useNotifications: () => ({}), getUserDisplayName: () => '검증 사용자' }));
vi.mock('@o4o/ui', () => ({ GlobalHeader: ({ homeSlot }: { homeSlot: ReactNode }) => <header>{homeSlot}</header>, GlobalHeaderMenuItem: () => null, buildCommunityPrimaryNav: mocks.nav }));
vi.mock('@o4o/auth-react', () => ({ MyHomeButton: () => null, O4OHomeButton: () => null, ServiceAccountMenu: () => null, O4O_LOGOUT_LABEL: '로그아웃', requestServiceHandoff: vi.fn() }));
import { KpaGlobalHeader } from '../KpaGlobalHeader';
beforeEach(() => { mocks.nav.mockClear(); mocks.user = { id: 'member', roles: ['kpa:pharmacist'], isStoreOwner: true }; });
afterEach(cleanup);
it.each([
  ['소유 약국이 확인된 회원', ['kpa:pharmacist'], true, true],
  ['기존 매장 소유자 역할', ['kpa:store_owner'], false, true],
  ['소유 약국 없는 운영자', ['kpa:operator'], false, false],
  ['소유 약국 없는 근무 약사', ['kpa:pharmacist'], false, false],
] as const)('%s에게 기존 프로필 메뉴와 동일한 매장 자격을 적용한다', async (_label, roles, isStoreOwner, visible) => {
  mocks.user = { id: 'member', roles: [...roles], isStoreOwner };
  await act(async () => { render(<MemoryRouter><KpaGlobalHeader /></MemoryRouter>); });
  expect(!!screen.queryByRole('button', { name: '내 매장' })).toBe(visible);
});
it('미로그인 사용자에게 매장 실행 버튼을 제공하지 않는다', async () => {
  mocks.user = null;
  await act(async () => { render(<MemoryRouter><KpaGlobalHeader /></MemoryRouter>); });
  expect(screen.queryByRole('button', { name: '내 매장' })).toBeNull();
});

it.each([['/businesses/network-a', false], ['/businesses/pharmacy', true]] as const)('사업 경로 %s에서 호스트 운영 메뉴 범위를 지킨다', async (path, visible) => {
  mocks.user = { id: 'operator', roles: ['neture:operator'], isStoreOwner: false };
  await act(async () => { render(<MemoryRouter initialEntries={[path]}><KpaGlobalHeader /></MemoryRouter>); });
  const options = mocks.nav.mock.calls.at(-1)?.[0] as unknown as { trailing: { href: string }[] };
  expect(options.trailing.some(item => item.href === '/operator/semi-franchises')).toBe(visible);
});
