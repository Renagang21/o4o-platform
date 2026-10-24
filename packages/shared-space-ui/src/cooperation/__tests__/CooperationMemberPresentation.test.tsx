import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { CooperationMemberNavigation } from '../CooperationMemberPresentation';

afterEach(cleanup);
const links = [
  { key: 'home', label: '홈', to: '/alpha?store=one', end: true },
  { key: 'news', label: '소식', to: '/alpha?store=one#news', end: true },
  { key: 'community', label: '회원 교류', to: '/alpha/community?store=one' },
];
it('distinguishes the home and news anchor and preserves the pharmacy selection during navigation', () => {
  render(<MemoryRouter initialEntries={['/alpha?store=one#news']}><CooperationMemberNavigation items={links} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: '소식' }).getAttribute('aria-current')).toBe('location');
  expect(screen.getByRole('link', { name: '홈' }).hasAttribute('aria-current')).toBe(false);
  fireEvent.click(screen.getByRole('link', { name: '회원 교류' }));
  expect(screen.getByRole('link', { name: '회원 교류' }).getAttribute('href')).toBe('/alpha/community?store=one');
  expect(screen.getByRole('link', { name: '회원 교류' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: '소식' }).hasAttribute('aria-current')).toBe(false);
});
it.each(['/alpha/community/post/one#reply', '/alpha/community#latest'])('keeps the member section active at %s', path => {
  render(<MemoryRouter initialEntries={[path]}><CooperationMemberNavigation items={links} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: '회원 교류' }).getAttribute('aria-current')).toBe('page');
});
it('does not match another cooperative with a similar slug', () => {
  render(<MemoryRouter initialEntries={['/alpha-community']}><CooperationMemberNavigation items={links} /></MemoryRouter>);
  expect(screen.getAllByRole('link').every(link => !link.hasAttribute('aria-current'))).toBe(true);
});
