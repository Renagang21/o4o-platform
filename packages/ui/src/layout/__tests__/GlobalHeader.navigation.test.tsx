import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalHeader } from '../GlobalHeader';

afterEach(cleanup);
it('keeps one service-owned account control when the mobile navigation is opened', () => {
  const logout = vi.fn();
  render(<MemoryRouter><GlobalHeader brand={{ name: '합성 서비스', icon: 'S' }} publicNav={[]} user={{ displayName: '회원', email: '' }} showMobileUserMenu={false} accountSlot={<button onClick={logout}>서비스 계정 종료</button>} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
  expect(screen.getAllByRole('button', { name: '서비스 계정 종료' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '서비스 계정 종료' }));
  expect(logout).toHaveBeenCalledTimes(1);
});
it('shares the actual responsive header height with drawers and restores the previous shell value', () => {
  const property = '--o4o-global-header-height';
  document.documentElement.style.setProperty(property, '72px');
  let height = 112;
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height }) as DOMRect);
  try {
    const { unmount } = render(<MemoryRouter><GlobalHeader brand={{ name: '합성 서비스', icon: 'S' }} publicNav={[]} /></MemoryRouter>);
    expect(document.documentElement.style.getPropertyValue(property)).toBe('112px');
    height = 168;
    fireEvent(window, new Event('resize'));
    expect(document.documentElement.style.getPropertyValue(property)).toBe('168px');
    unmount();
    expect(document.documentElement.style.getPropertyValue(property)).toBe('72px');
  } finally {
    measure.mockRestore();
    document.documentElement.style.removeProperty(property);
  }
});
it.each([
  { entry: '/', href: '/#news' }, { entry: '/#news', href: '/#news' },
  { entry: '/', href: '/?tab=memberships' }, { entry: '/?tab=memberships', href: '/?tab=memberships' },
  { entry: '/', href: '/materials' }, { entry: '/materials', href: '/materials' },
])('closes the mobile menu from $entry to $href, including reselection', async ({ entry, href }) => {
  render(<MemoryRouter initialEntries={[entry]}><GlobalHeader brand={{ name: 'CarePharm', icon: 'C' }} publicNav={[{ label: '이동할 곳', href }]} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
  const links = screen.getAllByRole('link', { name: '이동할 곳' });
  expect(links).toHaveLength(2);
  fireEvent.click(links[1]);
  await waitFor(() => expect(screen.queryByRole('button', { name: '메뉴 닫기' })).toBeNull());
  expect(screen.getAllByRole('link', { name: '이동할 곳' })).toHaveLength(1);
});
