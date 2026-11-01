import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlatformAdminLandingPage from '../pages/platform/account-governance/PlatformAdminLandingPage';
import PlatformSectionLayout from '../pages/platform/account-governance/PlatformSectionLayout';

it('offers only the remaining account/user tabs and the existing operator workflow', () => {
  render(<MemoryRouter initialEntries={['/admin/platform']}><Routes>
    <Route path="/admin/platform" element={<PlatformSectionLayout />}><Route index element={<PlatformAdminLandingPage />} /></Route>
  </Routes></MemoryRouter>);
  const nav = within(screen.getByRole('navigation', { name: '플랫폼 관리 메뉴' }));
  expect(nav.getAllByRole('link').map(link => link.textContent)).toEqual(['플랫폼 홈', '전체 관리자 계정', '사용자 조회']);
  expect(screen.getByRole('link', { name: /서비스 관리자/ })).toHaveAttribute('href', '/operators');
  expect(screen.getByRole('link', { name: '업무 운영자 지정' })).toHaveAttribute('href', '/admin/operations-operators');
  expect(screen.getByRole('region', { name: '업무 운영자 지정' })).toHaveTextContent('전체 관리자는 관리자 사이트 전체와 업무 운영을 모두 이용합니다.');
  for (const title of ['서비스 관리', '역할 관리', '서비스 대상 정책']) expect(screen.queryByRole('link', { name: title })).toBeNull();
});
