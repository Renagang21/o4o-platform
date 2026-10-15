import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { OperatorForumCategoriesPage } from '../OperatorForumCategoriesPage';
import type { ForumCategoriesClient } from '../types';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
const category = {
  id: 'c1',
  name: '검증 포럼',
  slug: 'fixture',
  isActive: true,
  forumType: 'open',
  postCount: 0,
  tags: [],
  createdAt: '2026-10-15T00:00:00Z',
  updatedAt: '2026-10-15T00:00:00Z',
};
function client() {
  return {
    getCategories: vi.fn().mockResolvedValue({ data: [category] }),
    updateCategory: vi.fn(),
    directDeactivate: vi.fn(),
    activate: vi.fn(),
    getDeleteCheck: vi.fn(),
    hardDelete: vi.fn(),
  } satisfies ForumCategoriesClient;
}
describe('forum category query recovery', () => {
  it('shows an error instead of an empty list and supports retry', async () => {
    const api = client();
    api.getCategories.mockRejectedValueOnce(new Error('포럼 읽기 장애'));
    render(<OperatorForumCategoriesPage client={api} />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      '포럼 읽기 장애',
    );
    expect(screen.queryByText('승인된 포럼이 여기에 표시됩니다')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: '포럼 목록 다시 조회' }),
    );
    await screen.findByText('검증 포럼');
  });
  it('rejects unsuccessful or malformed responses rather than showing zero records', async () => {
    const api = client();
    api.getCategories.mockResolvedValueOnce({
      success: false,
      error: '조회 거부',
    });
    render(<OperatorForumCategoriesPage client={api} />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      '조회 거부',
    );
    expect(screen.queryByText('승인된 포럼이 여기에 표시됩니다')).toBeNull();
  });
  it('ignores a late result from a previous client scope', async () => {
    let release!: (value: unknown) => void;
    const api = client();
    api.getCategories.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const view = render(
      <OperatorForumCategoriesPage client={api} tableId="old" />,
    );
    const next = client();
    next.getCategories.mockResolvedValue({
      data: [{ ...category, name: '현재 포럼' }],
    });
    view.rerender(<OperatorForumCategoriesPage client={next} tableId="new" />);
    await screen.findByText('현재 포럼');
    await act(async () => release({ data: [category] }));
    expect(screen.queryByText('검증 포럼')).toBeNull();
    expect(screen.getByText('현재 포럼')).toBeTruthy();
  });
  it('keeps Neture hard-delete hidden and requires the existing forum-name confirmation', async () => {
    const api = client();
    api.getCategories.mockResolvedValue({
      data: [{ ...category, postCount: 2 }],
    });
    render(
      <OperatorForumCategoriesPage
        client={api}
        disableHardDelete
        requireNameConfirmForNonEmpty
      />,
    );
    await screen.findByText('검증 포럼');
    fireEvent.click(screen.getByTitle('더보기'));
    expect(screen.queryByText('완전 삭제')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: '비활성화' }),
    );
    fireEvent.change(
      screen.getByPlaceholderText('예: 테스트 포럼 정리, 중복 포럼 제거 등'),
      { target: { value: '중복 정리' } },
    );
    const button = screen.getByRole('button', {
      name: '비활성화',
      }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('포럼명 입력'), {
      target: { value: '다른 이름' },
    });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('포럼명 입력'), {
      target: { value: '검증 포럼' },
    });
    expect(button.disabled).toBe(false);
    expect(api.hardDelete).not.toHaveBeenCalled();
  });
  it('retains the last rows after refresh failure and blocks stale row actions', async () => {
    const api = client();
    api.directDeactivate.mockResolvedValue({ success: true });
    render(<OperatorForumCategoriesPage client={api} />);
    await screen.findByText('검증 포럼');
    fireEvent.click(screen.getByTitle('더보기'));
    fireEvent.click(
      screen.getByRole('button', { name: '비활성화' }),
    );
    fireEvent.change(
      screen.getByPlaceholderText('예: 테스트 포럼 정리, 중복 포럼 제거 등'),
      { target: { value: '중복 정리' } },
    );
    api.getCategories.mockRejectedValueOnce(new Error('갱신 장애'));
    fireEvent.click(
      screen.getByRole('button', { name: '비활성화' }),
    );
    await screen.findByRole('alert');
    expect(screen.getByText('검증 포럼')).toBeTruthy();
    expect((screen.getByTitle('더보기') as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(
      screen.getByRole('button', { name: '포럼 목록 다시 조회' }),
    );
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect((screen.getByTitle('더보기') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(api.directDeactivate).toHaveBeenCalledTimes(1);
  });
});
