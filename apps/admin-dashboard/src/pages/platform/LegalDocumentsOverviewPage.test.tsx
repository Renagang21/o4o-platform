import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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

it('행을 체크하면 상단 ActionBar 로 편집 화면을 열고, 약국 협력사업 · 여러 건 선택은 편집을 열지 않는다', async () => {
  get.mockResolvedValue({ data: { data: scopes } });
  render(<MemoryRouter initialEntries={['/admin/legal-documents']}><Routes>
    <Route path="/admin/legal-documents" element={<LegalDocumentsOverviewPage />} />
    <Route path="/operations/neture/legal" element={<p>편집기 화면</p>} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByLabelText('합성 사업 (drugstore) 개인정보 처리방침/안내 선택'));
  expect((screen.getByRole('button', { name: '편집 화면 열기' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('이 문서는 해당 사업 관리자가 사업 운영 화면에서 편집합니다.')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('neture 이용약관 선택'));
  expect((screen.getByRole('button', { name: '편집 화면 열기' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('합성 사업 (drugstore) 개인정보 처리방침/안내 선택'));
  fireEvent.click(screen.getByRole('button', { name: '편집 화면 열기' }));
  expect(await screen.findByText('편집기 화면')).toBeTruthy();
});

it('범위 전체 선택은 그 표의 행만 고른다', async () => {
  get.mockResolvedValue({ data: { data: scopes } });
  render(<MemoryRouter><LegalDocumentsOverviewPage /></MemoryRouter>);
  fireEvent.click(await screen.findByLabelText('neture 전체 선택'));
  expect((screen.getByLabelText('neture 이용약관 선택') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('합성 사업 (drugstore) 개인정보 처리방침/안내 선택') as HTMLInputElement).checked).toBe(false);
});
