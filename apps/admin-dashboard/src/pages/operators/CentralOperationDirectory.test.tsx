import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CENTRAL_OPERATION_MENUS } from '@o4o/types';
import Page from './CentralOperationDirectory';
afterEach(cleanup);
it('gives common operations the full width, groups its menus, and places supplier below it', () => {
  render(<MemoryRouter><Page services={[["neture", "약국·공통 운영"], ["supplier", "공급자"]]} menus={CENTRAL_OPERATION_MENUS.filter(m => ['neture.members','neture.legacy-contact','supplier.suppliers'].includes(m.key))} /></MemoryRouter>);
  const common = screen.getByRole('heading', {name:'약국·공통 운영'}).closest('section')!;
  expect(common.className).toContain('md:col-span-2');
  const group = screen.getByText('회원·승인').closest('details')!;
  expect(group.open).toBe(false); fireEvent.click(group.querySelector('summary')!);
  expect(screen.getByRole('link', {name:'공통 회원 관리'}).getAttribute('href')).toBe('/operations/neture/members');
  const supplier = screen.getByRole('heading', {name:'공급자'}).closest('details')!;
  expect(supplier.open).toBe(false);
  expect(common.compareDocumentPosition(supplier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole('link', {name:'약사 자격 검토'})).toBeNull();
});
