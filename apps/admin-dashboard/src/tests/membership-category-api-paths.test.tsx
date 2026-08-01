/**
 * WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1 — 회귀 테스트
 *
 * `authClient.api` 의 baseURL 은 이미 `/api/v1` 이다
 * (packages/auth-client/src/client.ts getApiUrl → https://api.neture.co.kr/api/v1).
 * 따라서 호출 경로에 `/api` 를 덧붙이면 `/api/v1/api/...` 로 나가 404 가 된다.
 *
 * 2025-12 커밋 `3fe0b47d7` 이 **따옴표 리터럴**의 `/api` 만 제거해
 * **템플릿 리터럴**(`` `/api/membership/categories/${id}` ``) 2곳이 남아 있었다.
 * 이 테스트는 네 호출의 요청 URL 을 고정해 같은 실수의 재도입을 막는다.
 *
 * 운영 데이터는 건드리지 않는다 — 전부 mock 기반이다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();

vi.mock('@o4o/auth-client', () => ({
  authClient: {
    api: {
      get: (...a: unknown[]) => mockGet(...a),
      post: (...a: unknown[]) => mockPost(...a),
      put: (...a: unknown[]) => mockPut(...a),
      patch: (...a: unknown[]) => mockPatch(...a),
    },
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/common/AdminBreadcrumb', () => ({ default: () => null }));
vi.mock('@/components/membership/ExportButton', () => ({ default: () => null }));
vi.mock('@/hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => {} }));

import CategoryManagement from '../pages/membership/categories/CategoryManagement';

const CATEGORY = {
  id: 'cat-1',
  name: '정회원',
  description: '설명',
  requiresAnnualFee: true,
  annualFeeAmount: 120000,
  isActive: true,
  sortOrder: 1,
  memberCount: 0,
};

const okList = (rows: unknown[]) => ({ data: { success: true, data: rows } });

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockPatch.mockReset();
  mockGet.mockResolvedValue(okList([CATEGORY]));
  mockPut.mockResolvedValue({ data: { success: true } });
  mockPost.mockResolvedValue({ data: { success: true } });
});

/** 어떤 호출에도 이중 접두가 없어야 한다. */
const expectNoDoublePrefix = (url: string) => {
  expect(url.startsWith('/api/')).toBe(false);
  expect(url).not.toContain('/api/api');
  expect(url.startsWith('/membership/')).toBe(true);
};

describe('목록 조회', () => {
  it('GET 은 /membership/categories 로 나간다', async () => {
    render(<CategoryManagement />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toBe('/membership/categories');
    expectNoDoublePrefix(url);
  });
});

describe('수정 (PUT) — 이번 수정 대상', () => {
  it('PUT 이 /membership/categories/:id 로 나간다 (이중 /api 없음)', async () => {
    render(<CategoryManagement />);
    await waitFor(() => expect(screen.getByTitle('수정')).toBeTruthy());

    fireEvent.click(screen.getByTitle('수정'));
    await waitFor(() => expect(screen.getAllByText('저장').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('저장')[0]);

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    const [url, payload] = mockPut.mock.calls[0] as [string, Record<string, unknown>];

    expect(url).toBe(`/membership/categories/${CATEGORY.id}`);
    expectNoDoublePrefix(url);
    // payload 계약 유지
    expect(payload).toMatchObject({
      name: CATEGORY.name,
      requiresAnnualFee: true,
      annualFeeAmount: CATEGORY.annualFeeAmount,
      isActive: CATEGORY.isActive,
      sortOrder: CATEGORY.sortOrder,
    });
  });

  it('저장 성공 후 목록을 다시 조회한다', async () => {
    render(<CategoryManagement />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTitle('수정'));
    await waitFor(() => expect(screen.getAllByText('저장').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('저장')[0]);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('PUT 실패 시 목록을 다시 조회하지 않는다 (오류 처리)', async () => {
    mockPut.mockImplementation(() => Promise.reject(Object.assign(new Error('fail'), { response: { data: {} } })));
    render(<CategoryManagement />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTitle('수정'));
    await waitFor(() => expect(screen.getAllByText('저장').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('저장')[0]);

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

describe('생성 (POST) — 무변경 확인', () => {
  it('POST 는 /membership/categories 를 유지한다', async () => {
    mockGet.mockResolvedValue(okList([]));
    render(<CategoryManagement />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.click(screen.getByText('분류 추가'));
    await waitFor(() => expect(screen.getAllByText('저장').length).toBeGreaterThan(0));

    const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '신규분류' } });
    fireEvent.click(screen.getAllByText('저장')[0]);

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const url = mockPost.mock.calls[0][0] as string;
    expect(url).toBe('/membership/categories');
    expectNoDoublePrefix(url);
  });
});

describe('소스 계약 — 이중 접두 재도입 차단', () => {
  const SRC = readFileSync(
    join(__dirname, '../pages/membership/categories/CategoryManagement.tsx'),
    'utf8',
  ).replace(/^\s*\/\/.*$/gm, ''); // 설명 주석 제외

  it('이 파일의 authClient 호출에 /api 접두가 남아 있지 않다', () => {
    const calls = [...SRC.matchAll(/authClient\.api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)/g)];
    expect(calls.length).toBeGreaterThanOrEqual(4);
    for (const [, method, path] of calls) {
      expect(`${method} ${path}`).not.toContain('/api/');
      expect(path.startsWith('/membership/')).toBe(true);
    }
  });

  it('활성 토글(PATCH) 경로도 교정되어 있다', () => {
    // 현재 이 핸들러는 UI 에 연결돼 있지 않지만(호출부 없음),
    // 나중에 연결될 때를 대비해 경로를 고정한다.
    expect(SRC).toMatch(/authClient\.api\.patch\(\s*`\/membership\/categories\/\$\{id\}`/);
    expect(SRC).not.toContain('/api/membership/categories');
  });
});
