/**
 * WO-O4O-ADMIN-HUB-NOTICES-CRASH-FIX-V1 — 회귀 테스트
 *
 * 크래시 원인: `/kpa/news/admin/list` 는 **평면형** 응답
 *   { success, data, total, page, limit, totalPages }
 * 인데 화면이 형제 화면(HubContentsPage) 의 **중첩형** `pagination.totalPages` 를 읽어
 * 조회 성공 시마다 `Cannot read properties of undefined (reading 'totalPages')` 로 크래시했다.
 *
 * 이 테스트는 응답 형태별로
 *   - 정상 목록 / 정상 빈 목록  → 성공(빈 목록은 오류 아님)
 *   - 비정상 응답 구조          → NoticeContractError (빈 목록으로 위장하지 않음)
 *   - totalPages 산출           → 평면 필드 우선, 누락 시 보정, 불가 시 1
 * 을 고정한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();

vi.mock('@o4o/auth-client', () => ({
  authClient: { api: { get: (...args: unknown[]) => mockGet(...args) } },
}));
// 페이지 모듈이 끌어오는 UI/아이콘 의존은 계약 로직과 무관하므로 가볍게 대체한다.
vi.mock('@o4o/ui', () => ({ BaseTable: () => null }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  fetchNotices,
  resolveTotalPages,
  formatDate,
  createNoticeColumns,
  NoticeContractError,
} from '../pages/kpa/HubNoticeListPage';

const NOTICE = {
  id: 'n1',
  title: '공지사항 테스트',
  summary: null,
  status: 'published' as const,
  isPinned: false,
  publishedAt: '2026-04-25T23:01:29.347Z',
  expiresAt: null,
  createdAt: '2026-04-25T23:01:29.348Z',
};

/** 프로덕션에서 실측한 실제 응답 형태 (kpa.routes.ts:1230) */
const REAL_RESPONSE = { success: true, data: [NOTICE], total: 1, page: 1, limit: 20, totalPages: 1 };

beforeEach(() => mockGet.mockReset());

describe('fetchNotices — 응답 계약', () => {
  it('실제 평면형 응답을 그대로 통과시킨다 (크래시 재발 방지)', async () => {
    mockGet.mockResolvedValue({ data: REAL_RESPONSE });
    const body = await fetchNotices(1);
    expect(body.data).toHaveLength(1);
    expect(resolveTotalPages(body)).toBe(1);
  });

  it('정상 빈 목록은 오류가 아니다', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 } });
    const body = await fetchNotices(1);
    expect(body.data).toEqual([]);
  });

  it('data 가 배열이 아니면 계약 위반으로 오류를 던진다 (빈 목록 위장 금지)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { items: [] } } });
    await expect(fetchNotices(1)).rejects.toBeInstanceOf(NoticeContractError);
  });

  it('data 키가 없으면 계약 위반이다', async () => {
    mockGet.mockResolvedValue({ data: { success: true } });
    await expect(fetchNotices(1)).rejects.toBeInstanceOf(NoticeContractError);
  });

  it('본문이 비어 있으면 계약 위반이다', async () => {
    mockGet.mockResolvedValue({ data: null });
    await expect(fetchNotices(1)).rejects.toBeInstanceOf(NoticeContractError);
  });

  it('API 오류와 계약 위반은 서로 다른 오류로 구분된다', () => {
    // 화면은 `error instanceof NoticeContractError` 로 두 오류를 갈라 다른 메시지를 낸다.
    // (fetchNotices 에는 try/catch 가 없어 axios 오류는 가공 없이 그대로 전파된다.)
    expect(new Error('Network Error')).not.toBeInstanceOf(NoticeContractError);
    expect(new NoticeContractError('bad shape')).toBeInstanceOf(NoticeContractError);
    expect(new NoticeContractError('bad shape')).toBeInstanceOf(Error);
    expect(new NoticeContractError('bad shape').name).toBe('NoticeContractError');
  });
});

describe('resolveTotalPages', () => {
  it('평면 totalPages 를 우선 사용한다', () => {
    expect(resolveTotalPages({ ...REAL_RESPONSE, totalPages: 7 })).toBe(7);
  });

  it('totalPages 누락 시 total/limit 로 보정한다', () => {
    const body = { success: true, data: [], total: 45, page: 1, limit: 20 } as never;
    expect(resolveTotalPages(body)).toBe(3);
  });

  it('중첩형(pagination) 응답이 와도 크래시하지 않고 1 로 떨어진다', () => {
    const nested = { success: true, data: [], pagination: { page: 1, limit: 20, total: 5, totalPages: 5 } } as never;
    expect(() => resolveTotalPages(nested)).not.toThrow();
    expect(resolveTotalPages(nested)).toBe(1);
  });

  it('undefined / 산출 불가 시 1 을 반환한다', () => {
    expect(resolveTotalPages(undefined)).toBe(1);
    expect(resolveTotalPages({ success: true, data: [] } as never)).toBe(1);
    expect(resolveTotalPages({ ...REAL_RESPONSE, totalPages: 0, total: 0, limit: 0 })).toBe(1);
  });
});

describe('컬럼 render — BaseTable 호출 규약 (value, row, index)', () => {
  const columns = createNoticeColumns({ onEdit: vi.fn(), onArchive: vi.fn() });

  // BaseTable 은 `col.render(value, row, rowIndex)` 로 호출한다
  // (packages/ui/src/components/table/BaseTable.tsx:623).
  const callAsBaseTable = (col: (typeof columns)[number], row: Record<string, unknown>) =>
    col.render!((row as never)[col.key as keyof typeof row], row as never, 0);

  it('모든 컬럼이 실제 호출 규약에서 예외 없이 렌더된다', () => {
    for (const col of columns) {
      expect(() => callAsBaseTable(col, NOTICE)).not.toThrow();
    }
  });

  it('expiresAt 이 null 이어도 크래시하지 않는다 (2차 크래시 재발 방지)', () => {
    // 첫 인자를 row 로 잘못 받으면 여기서 `null.expiresAt` 로 터졌다.
    const col = columns.find((c) => c.key === 'expiresAt')!;
    expect(() => callAsBaseTable(col, { ...NOTICE, expiresAt: null })).not.toThrow();
  });

  it('선택 필드가 모두 null 이어도 전 컬럼이 안전하다', () => {
    const sparse = { ...NOTICE, summary: null, expiresAt: null, publishedAt: null };
    for (const col of columns) {
      expect(() => callAsBaseTable(col, sparse)).not.toThrow();
    }
  });

  it('컬럼 render 는 셀 값이 아니라 row 를 사용한다', () => {
    // 잘못된 구현(첫 인자를 row 취급)이면 제목이 비어 렌더된다.
    const col = columns.find((c) => c.key === 'title')!;
    const out = JSON.stringify(callAsBaseTable(col, NOTICE));
    expect(out).toContain(NOTICE.title);
  });
});

describe('formatDate — 선택 필드 안전성', () => {
  it('null/undefined/빈 문자열을 대시로 처리한다', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('파싱 불가 값을 Invalid Date 로 노출하지 않는다', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('정상 ISO 값은 날짜로 표시한다', () => {
    expect(formatDate('2026-04-25T23:01:29.348Z')).not.toBe('—');
  });
});
