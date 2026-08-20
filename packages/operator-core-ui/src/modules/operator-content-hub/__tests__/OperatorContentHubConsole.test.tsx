/**
 * OperatorContentHubConsole — View 상태/설정 계약 테스트
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1 §12
 *   loading / error+retry / empty / populated / 필터(검색·카테고리·상태) /
 *   status 표시 / action callback(onOpenItem) / 서비스별 optional slot 을 고정한다.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { OperatorContentHubConsole } from '../OperatorContentHubConsole';
import type { ContentHubClient, ContentHubItem, ContentHubStatusOption } from '../types';

// vitest globals 미사용 설정이라 auto-cleanup 이 걸리지 않는다 — 명시적으로 unmount.
afterEach(() => cleanup());

const STATUS_OPTIONS: ContentHubStatusOption[] = [
  { value: 'ready', label: '완료', badgeClass: 'bg-green-100 text-green-700', formLabel: '완료 (즉시 사용)' },
  { value: 'draft', label: '초안', badgeClass: 'bg-amber-100 text-amber-700', formLabel: '초안 (비노출)' },
];

const ITEM: ContentHubItem = {
  id: 'c-1',
  title: '약국 경영 가이드',
  summary: '요약문',
  category: '약국경영',
  tags: ['경영'],
  status: 'ready',
  source_type: 'manual',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

function makeClient(overrides: Partial<ContentHubClient> = {}): ContentHubClient {
  return {
    list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderConsole(props: Partial<React.ComponentProps<typeof OperatorContentHubConsole>> = {}) {
  const client = props.client ?? makeClient();
  render(
    <OperatorContentHubConsole
      client={client}
      tableId="t-content-hub"
      statusOptions={STATUS_OPTIONS}
      defaultStatus="ready"
      {...props}
    />
  );
  return client;
}

describe('OperatorContentHubConsole', () => {
  it('loading 중에는 새로고침 버튼이 비활성화된다', () => {
    renderConsole({ client: makeClient({ list: vi.fn(() => new Promise<never>(() => {})) }) });
    expect((screen.getByText('새로고침').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('조회 실패 시 에러와 다시 시도 버튼을 노출하고 재조회한다', async () => {
    const list = vi.fn().mockRejectedValue(new Error('불러오기 실패'));
    renderConsole({ client: makeClient({ list }) });

    await waitFor(() => expect(screen.getByText('불러오기 실패')).toBeTruthy());
    expect(list).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('다시 시도'));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('빈 목록이면 empty 메시지와 등록 CTA 를 노출한다', async () => {
    renderConsole();
    await waitFor(() => expect(screen.getByText(/등록된 콘텐츠가 없습니다/)).toBeTruthy());
    expect(screen.getByText('첫 콘텐츠 등록')).toBeTruthy();
  });

  it('데이터가 있으면 목록과 status badge 를 렌더한다', async () => {
    renderConsole({
      client: makeClient({
        list: vi.fn().mockResolvedValue({ items: [ITEM], total: 1, page: 1, limit: 20, totalPages: 1 }),
      }),
    });
    await waitFor(() => expect(screen.getByText('약국 경영 가이드')).toBeTruthy());
    expect(screen.getByText('완료')).toBeTruthy();
  });

  it('검색어를 client.list 파라미터로 전달한다', async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    renderConsole({ client: makeClient({ list }) });
    await waitFor(() => expect(list).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('제목/요약 검색...'), { target: { value: '경영' } });
    fireEvent.click(screen.getByText('검색'));

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: '경영', page: 1 }))
    );
  });

  it('status 필터 변경을 client.list 로 전달한다', async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    renderConsole({ client: makeClient({ list }), allStatusValue: 'all', allStatusLabel: '전체' });
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: 'all' })));

    const statusSelect = screen.getByDisplayValue('전체');
    fireEvent.change(statusSelect, { target: { value: 'draft' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'draft' })));
  });

  it('categoryOptions 미지정이면 카테고리 필터를 노출하지 않는다', async () => {
    renderConsole();
    await waitFor(() => expect(screen.getByText('검색')).toBeTruthy());
    expect(screen.queryByText('전체 카테고리')).toBeNull();
  });

  it('categoryOptions 지정 시 카테고리 필터를 노출한다', async () => {
    renderConsole({ categoryOptions: ['약국경영', '교육'] });
    await waitFor(() => expect(screen.getByText('전체 카테고리')).toBeTruthy());
    expect(screen.getByText('교육')).toBeTruthy();
  });

  it('onOpenItem 이 있으면 제목 클릭이 콜백을 호출한다', async () => {
    const onOpenItem = vi.fn();
    renderConsole({
      client: makeClient({
        list: vi.fn().mockResolvedValue({ items: [ITEM], total: 1, page: 1, limit: 20, totalPages: 1 }),
      }),
      onOpenItem,
    });
    await waitFor(() => expect(screen.getByText('약국 경영 가이드')).toBeTruthy());
    fireEvent.click(screen.getByText('약국 경영 가이드'));
    expect(onOpenItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }));
  });

  it('headerActions / createButtonLabel 등 서비스 고유 설정을 반영한다', async () => {
    renderConsole({
      title: '콘텐츠 허브 관리',
      createButtonLabel: '콘텐츠 만들기',
      headerActions: <button>콘텐츠 제작 가이드</button>,
    });
    await waitFor(() => expect(screen.getByText('콘텐츠 허브 관리')).toBeTruthy());
    expect(screen.getByText('콘텐츠 만들기')).toBeTruthy();
    expect(screen.getByText('콘텐츠 제작 가이드')).toBeTruthy();
  });

  it('headerActions 미지정이면 서비스 고유 액션이 없다', async () => {
    renderConsole();
    await waitFor(() => expect(screen.getByText('새로고침')).toBeTruthy());
    expect(screen.queryByText('콘텐츠 제작 가이드')).toBeNull();
  });

  it('statCards 설정대로 현재 페이지 통계를 센다', async () => {
    renderConsole({
      client: makeClient({
        list: vi.fn().mockResolvedValue({ items: [ITEM], total: 7, page: 1, limit: 20, totalPages: 1 }),
      }),
      statCards: [
        { label: '완료 (현재 페이지)', status: 'ready', tone: 'green' },
        { label: '초안 (현재 페이지)', status: 'draft', tone: 'amber' },
      ],
    });
    await waitFor(() => expect(screen.getByText('전체 콘텐츠')).toBeTruthy());
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('완료 (현재 페이지)')).toBeTruthy();
    expect(screen.getByText('초안 (현재 페이지)')).toBeTruthy();
  });
});
