import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PharmacyRegistrationNotice from './PharmacyRegistrationNotice';
const reload = vi.hoisted(() => vi.fn());
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture' }, isAuthenticated: true, isLoading: false }) }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ reload }) }));
vi.mock('@o4o/auth-react', () => ({ MyHomeButton: () => <button>My Home</button> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('retired application URLs explain automatic linking and never offer a second application', () => {
  render(<MemoryRouter><PharmacyRegistrationNotice /></MemoryRouter>);
  expect(screen.getByText(/별도 매장 신청은 필요하지 않습니다/)).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: '가입 신청' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '매장 연결 다시 확인' }));
  expect(reload).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: '내 매장으로' }).getAttribute('href')).toBe('/store');
});
