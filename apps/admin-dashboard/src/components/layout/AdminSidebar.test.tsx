import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AdminSidebar from './AdminSidebar';

// useAdminMenu() 는 실제로 렌더마다 새 배열을 돌려준다. 같은 조건을 재현한다(#986 Codex P1).
vi.mock('@/hooks/useAdminMenu', () => ({
  useAdminMenu: () => ({
    menuItems: [
      {
        id: 'synthetic-group',
        label: 'Synthetic group',
        children: [{ id: 'synthetic-child', label: 'Synthetic child', path: '/admin/platform/users' }],
      },
    ],
    isLoading: false,
  }),
}));

afterEach(() => cleanup());

it('expands the group of the current route without an endless re-render when the menu array is recreated each render', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <MemoryRouter initialEntries={['/admin/platform/users']}>
      <AdminSidebar isOpen onClose={() => {}} />
    </MemoryRouter>,
  );
  expect(screen.getByText('Synthetic child')).toBeTruthy();
  expect(errors.mock.calls.some(call => String(call[0]).includes('Maximum update depth'))).toBe(false);
  errors.mockRestore();
});
