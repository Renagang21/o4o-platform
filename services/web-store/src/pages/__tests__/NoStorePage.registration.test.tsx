import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const reload = vi.hoisted(() => vi.fn());
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ reload }) }));
import NoStorePage from '../NoStorePage';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('explains automatic store connection and keeps invitation/retry without another pharmacy application', () => {
  render(<MemoryRouter><NoStorePage /></MemoryRouter>);
  expect(screen.getByText(/승인을 받으면 내 매장이 자동으로 연결/)).toBeTruthy();
  expect(screen.queryByRole('link', { name: /내 매장.*신청/ })).toBeNull();
  expect(screen.getByRole('link', { name: '가입 정보 확인' }).getAttribute('href')).toBe('https://neture.co.kr/signup');
  expect(screen.getByRole('link', { name: '받은 초대 확인' }).getAttribute('href')).toBe('/invitations');
  fireEvent.click(screen.getByRole('button', { name: '다시 확인' }));
  expect(reload).toHaveBeenCalledTimes(1);
});
