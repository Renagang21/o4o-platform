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
  const client = { get: vi.fn().mockResolvedValue(list), post: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { success: true } }) };
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

it('does not discard a draft when an HTTP success contains a failed business response', async () => {
  const client = { get: vi.fn().mockResolvedValue(list), post: vi.fn().mockResolvedValue({ data: { success: false } }) };
  render(<ImprovementForum client={client as never} actorKey="member" onSelect={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '글 작성' }));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: 'Preserved issue' } });
  fireEvent.change(screen.getByLabelText('내용'), { target: { value: 'Preserved reproduction' } });
  fireEvent.click(screen.getByRole('button', { name: '공개 글 등록' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('제목') as HTMLInputElement).value).toBe('Preserved issue');
  expect(screen.queryByText('글을 등록했습니다.')).toBeNull();
});
it('does not overwrite an edit draft baseline after a focus refresh', async () => {
  const client = { get: vi.fn().mockResolvedValueOnce({ data: { data: item } }).mockResolvedValue({ data: { data: { ...item, title: 'Newer title', body: 'Newer description', version: 4 } } }), patch: vi.fn() };
  render(<ImprovementForum client={client as never} actorKey="member" detailId="one" onSelect={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '내 글 수정' }));
  fireEvent.change(screen.getByLabelText('수정 내용'), { target: { value: 'My retained old draft' } });
  await act(async () => window.dispatchEvent(new Event('focus')));
  await screen.findByText('수정 중 다른 변경이 도착했습니다. 초안을 보관한 뒤 최신 글을 확인해 주세요.');
  expect((screen.getByLabelText('수정 내용') as HTMLTextAreaElement).value).toBe('My retained old draft');
  expect((screen.getByRole('button', { name: '수정 저장' }) as HTMLButtonElement).disabled).toBe(true);
  expect(client.patch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '최신 글로 다시 편집' }));
  expect((screen.getByLabelText('수정 내용') as HTMLTextAreaElement).value).toBe('Newer description');
});
it('keeps a pending official reply and its selected state when automatic refresh detects newer work', async () => {
  const client = { get: vi.fn().mockResolvedValueOnce({ data: { data: { ...item, canManage: true } } }).mockResolvedValue({ data: { data: { ...item, canManage: true, version: 4, state: 'needs_info' } } }), post: vi.fn() };
  render(<ImprovementForum client={client as never} actorKey="manager" detailId="one" management onSelect={vi.fn()} />);
  await screen.findByText('Synthetic issue');
  fireEvent.change(screen.getByLabelText('처리 상태'), { target: { value: 'completed' } });
  fireEvent.change(screen.getByLabelText('공개 답변·처리 사유'), { target: { value: 'Retained reply' } });
  await act(async () => window.dispatchEvent(new Event('focus')));
  await screen.findByText('새 답변이나 상태 변경이 있습니다. 작성한 답변은 유지됩니다. 최신 내용을 확인해 주세요.');
  expect((screen.getByLabelText('처리 상태') as HTMLSelectElement).value).toBe('completed');
  expect((screen.getByRole('button', { name: '답변·상태 저장' }) as HTMLButtonElement).disabled).toBe(true);
  expect(client.post).not.toHaveBeenCalled();
});
it('removes a previously visible detail after public visibility is withdrawn', async () => {
  const client = { get: vi.fn().mockResolvedValueOnce({ data: { data: item } }).mockRejectedValue({ response: { status: 404, data: { error: '공개 철회' } } }) };
  render(<ImprovementForum client={client as never} actorKey="" detailId="one" onSelect={vi.fn()} />);
  await screen.findByText('Issue description');
  await act(async () => window.dispatchEvent(new Event('focus')));
  await screen.findByRole('alert');
  expect(screen.queryByText('Issue description')).toBeNull();
  expect(screen.queryByText('Synthetic issue')).toBeNull();
});
