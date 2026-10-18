import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { ServiceAccountMenu } from './ServiceAccountMenu';

afterEach(cleanup);
const displayName = '검증용 서비스 회원';
function mount(onLogout = vi.fn()) {
  return render(<MemoryRouter><ServiceAccountMenu displayName={displayName} email="member@example.invalid" onLogout={onLogout} badge={<span>Demo 계정</span>}>
    <Link to="/operator">운영 대시보드</Link>
  </ServiceAccountMenu><button>바깥</button></MemoryRouter>);
}

it('shows one named account trigger and keeps identity details and Demo notice inside its menu', () => {
  mount();
  const trigger = screen.getByRole('button', { name: '계정 메뉴' });
  expect(within(trigger).getByText(displayName)).toBeTruthy();
  expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
  expect(screen.queryByText('member@example.invalid')).toBeNull();
  expect(screen.queryByText('Demo 계정')).toBeNull();
  fireEvent.click(trigger);
  const menu = screen.getByRole('region', { name: '계정 메뉴' });
  expect(within(menu).getByText('Demo 계정')).toBeTruthy();
  expect(within(menu).getByRole('link', { name: '운영 대시보드' }).getAttribute('href')).toBe('/operator');
  expect(screen.getAllByRole('button', { name: '계정 메뉴' })).toHaveLength(1);
});

it('closes on Escape with focus restored and on an outside click', () => {
  mount();
  const trigger = screen.getByRole('button', { name: '계정 메뉴' });
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: '계정 메뉴' })).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.mouseDown(screen.getByRole('button', { name: '바깥' }));
  expect(screen.queryByRole('region', { name: '계정 메뉴' })).toBeNull();
});

it('closes after service navigation and invokes the existing logout only once', () => {
  const logout = vi.fn();
  mount(logout);
  const trigger = screen.getByRole('button', { name: '계정 메뉴' });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('link', { name: '운영 대시보드' }));
  expect(screen.queryByRole('region', { name: '계정 메뉴' })).toBeNull();
  expect(logout).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: 'O4O 로그아웃' }));
  expect(logout).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('region', { name: '계정 메뉴' })).toBeNull();
});
