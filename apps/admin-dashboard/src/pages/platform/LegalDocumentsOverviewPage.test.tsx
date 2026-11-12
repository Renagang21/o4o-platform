import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.hoisted(() => vi.fn());
vi.mock('@o4o/auth-client', () => ({ authClient: { api: { get } } }));
import LegalDocumentsOverviewPage, { type LegalScope } from './LegalDocumentsOverviewPage';

afterEach(() => { cleanup(); get.mockReset(); });

const scopes: LegalScope[] = [
  { serviceKey: 'neture', tier: 'account', label: 'neture', note: null, editPath: '/operations/neture/legal', documents: [
    { documentType: 'terms', slug: 'neture-account-terms', title: '계정 이용약관', published: { version: 1, effectiveDate: '2026-09-17', publishedAt: '2026-09-18', acceptances: 6 }, pendingDraft: { version: 2, effectiveDate: '2026-12-01' } },
  ] },
  { serviceKey: 'business:x', tier: 'business', label: '합성 사업 (drugstore)', note: '해당 사업 관리자가 사업 운영 화면에서 편집합니다', editPath: null, documents: [
    { documentType: 'privacy', slug: null, title: '개인정보 안내', published: null, pendingDraft: null },
  ] },
  { serviceKey: 'k-cosmetics', tier: 'other', label: 'k-cosmetics', note: '퇴역 서비스 — 동의 증빙 보존 대상', editPath: null, documents: [] },
];

it('단계별로 게시본 · 동의 · 다음 버전 시행 예정을 보이고, 편집은 계정 · 직영에만 연결한다', async () => {
  get.mockResolvedValue({ data: { data: scopes } });
  render(<MemoryRouter><LegalDocumentsOverviewPage /></MemoryRouter>);
  const account = await screen.findByRole('region', { name: '① 계정 공통' });
  expect(within(account).getByText('v1')).toBeTruthy();
  expect(within(account).getByText('6건')).toBeTruthy();
  expect(within(account).getByText('v2 초안 · 시행 예정 2026-12-01')).toBeTruthy();
  expect(within(account).getByRole('link', { name: '편집' }).getAttribute('href')).toBe('/operations/neture/legal');
  const business = screen.getByRole('region', { name: '③ 약국 협력사업별 약관' });
  expect(within(business).getByText(/사업 관리자가 사업 운영 화면에서 편집/)).toBeTruthy();
  expect(within(business).queryByRole('link', { name: '편집' })).toBeNull();
  expect(within(screen.getByRole('region', { name: '기타 · 퇴역' })).getByText(/퇴역 서비스/)).toBeTruthy();
  expect(get).toHaveBeenCalledWith('/admin/legal-documents/overview');
});

it('불러오기 실패를 알린다', async () => {
  get.mockRejectedValue(new Error('x'));
  render(<MemoryRouter><LegalDocumentsOverviewPage /></MemoryRouter>);
  expect((await screen.findByRole('alert')).textContent).toMatch(/불러오지 못했습니다/);
});
