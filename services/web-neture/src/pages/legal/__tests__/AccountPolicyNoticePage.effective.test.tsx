import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api }));
import AccountPolicyNoticePage, { effectiveLine } from '../AccountPolicyNoticePage';

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

const meta = (version: number, effectiveDate: string | null, slug = 'neture-account-terms') => ({ version, effectiveDate, slug });

it('시행일은 관리자가 정한 값만 쓴다 — 게시된 v2 → 시행 중, 예정 초안 → 시행 예정, 없으면 날짜 없음', () => {
  expect(effectiveLine(meta(2, '2026-12-01T00:00:00.000Z'), null)).toBe('시행일 2026-12-01 (시행 중)');
  expect(effectiveLine(meta(1, '2026-09-17'), meta(2, '2026-12-05'))).toBe('시행 예정일 2026-12-05');
  expect(effectiveLine(meta(1, '2026-09-17'), null)).toBe('시행일은 확정되면 이 공고에 안내합니다');
  // v1 이나 다른 표식의 게시본은 개정안 시행으로 보지 않는다
  expect(effectiveLine(meta(2, '2026-12-01', 'other-terms'), null)).toBe('시행일은 확정되면 이 공고에 안내합니다');
  expect(effectiveLine(null, null)).toBe('시행일은 확정되면 이 공고에 안내합니다');
});

it('공고 페이지는 게시본과 시행 예정 API 를 읽어 관리자 시행일을 표시하고, 고정 날짜를 쓰지 않는다', async () => {
  api.get.mockImplementation((path: string) => {
    if (path.endsWith('/scheduled?slug=neture-account-terms')) return Promise.resolve({ data: { data: meta(2, '2026-12-05') } });
    if (path === '/public/services/neture/policies/terms') return Promise.resolve({ data: { data: meta(1, '2026-09-17') } });
    return Promise.resolve({ data: { data: null } });
  });
  render(<MemoryRouter><AccountPolicyNoticePage /></MemoryRouter>);
  expect(await screen.findByText(/시행 예정일 2026-12-05/)).toBeTruthy();
  expect(screen.queryByText(/2026-11-13/)).toBeNull();
  expect(api.get).toHaveBeenCalledWith('/public/services/neture/policies/terms/scheduled?slug=neture-account-terms');
});
