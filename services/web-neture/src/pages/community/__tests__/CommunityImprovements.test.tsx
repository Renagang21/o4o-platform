import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ImprovementForum from '../../../../../../packages/operator-core-ui/src/modules/community-improvements/ImprovementForum';
const item = { id: 'one', title: 'Synthetic issue', body: 'Issue description', kind: 'bug', state: 'received', version: 3, mine: true, canManage: false, createdAt: '2026-11-01T00:00:00Z', replies: [] };
const list = { data: { data: { ready: true, canManage: false, items: [item], hasMore: false } } };
afterEach(cleanup);
it('shows public requests without exposing member writing or official management to guests', async () => {
  const client = { get: vi.fn().mockResolvedValue(list), post: vi.fn() };
  const select = vi.fn(); render(<ImprovementForum client={client as never} actorKey="" onSelect={select} />);
  fireEvent.click(await screen.findByText('Synthetic issue'));
  expect(select).toHaveBeenCalledWith('one'); expect(screen.getByText('로그인 후 요청 작성')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '글 작성' })).toBeNull();
  expect(screen.getByText(/모든 글과 답변은 공개/)).toBeTruthy();
});
it('preserves a failed draft and reuses its idempotency key on retry', async () => {
  const client = { get: vi.fn().mockResolvedValue(list), post: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({}) };
  render(<ImprovementForum client={client as never} actorKey="member" onSelect={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '글 작성' }));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: 'New issue' } });
  fireEvent.change(screen.getByLabelText('내용'), { target: { value: 'Description of issue' } });
  fireEvent.click(screen.getByRole('button', { name: '공개 글 등록' }));
  await screen.findByRole('alert'); expect((screen.getByLabelText('내용') as HTMLTextAreaElement).value).toBe('Description of issue');
  // Retry after a network failure retains the draft; refresh clears the error without discarding it.
  fireEvent.click(screen.getByRole('button', { name: '다시 조회' })); await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: '공개 글 등록' }));
  await screen.findByText('글을 등록했습니다.'); expect(client.post.mock.calls[0][1].requestId).toBe(client.post.mock.calls[1][1].requestId);
});
it('posts an official decision with the displayed version and retains text after a conflict', async () => {
  const client = { get: vi.fn().mockResolvedValue({ data: { data: { ...item, canManage: true } } }), post: vi.fn().mockRejectedValue({ response: { data: { error: '다시 조회해 주세요.' } } }) };
  render(<ImprovementForum client={client as never} actorKey="manager" detailId="one" management onSelect={vi.fn()} />);
  await screen.findByText('Synthetic issue');
  fireEvent.change(screen.getByLabelText('처리 상태'), { target: { value: 'completed' } });
  fireEvent.change(screen.getByLabelText('공개 답변·처리 사유'), { target: { value: 'Applied and verified' } });
  fireEvent.click(screen.getByRole('button', { name: '답변·상태 저장' }));
  await screen.findByRole('alert'); expect(client.post).toHaveBeenCalledWith(expect.stringContaining('/one/replies'), { body: 'Applied and verified', state: 'completed', version: 3, official: true });
  expect((screen.getByLabelText('공개 답변·처리 사유') as HTMLTextAreaElement).value).toBe('Applied and verified');
});
it('ignores a late response after identity changes', async () => {
  let finish!: (value: unknown) => void;
  const client = { get: vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ data: { data: { ...list.data.data, items: [] } } }) };
  const v = render(<ImprovementForum client={client as never} actorKey="old" onSelect={vi.fn()} />);
  v.rerender(<ImprovementForum client={client as never} actorKey="new" onSelect={vi.fn()} />);
  await screen.findByText('표시할 글이 없습니다.'); await act(async () => finish(list)); expect(screen.queryByText('Synthetic issue')).toBeNull();
});
it('keeps official operations on the central surface even for a public-page manager', async () => {
  const client = { get: vi.fn().mockResolvedValue({ data: { data: { ...item, canManage: true } } }) };
  render(<ImprovementForum client={client as never} actorKey="manager" detailId="one" onSelect={vi.fn()} />);
  const link = await screen.findByRole('link', { name: '통합 운영에서 공식 답변·업데이트 관리 →' });
  expect(link.getAttribute('href')).toBe('https://admin.neture.co.kr/operations/community/forums?tab=improvements&improvement=one');
  expect(screen.queryByRole('button', { name: '답변·상태 저장' })).toBeNull();
});
