import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Blog from '../../PharmacyBlogPage';
const api = vi.hoisted(() => ({ store: 'A', slug: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), settings: vi.fn(), saveSettings: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society', getActiveServicePublicOrigin: () => 'https://fixture.example.test' }));
vi.mock('../../../../api/pharmacyInfo', () => ({ getStoreSlug: api.slug }));
vi.mock('../../../../api/blogStaff', () => ({ fetchStaffBlogPosts: api.list, createBlogPost: api.create, updateBlogPost: api.update, fetchBlogSettings: api.settings, updateBlogSettings: api.saveSettings }));
vi.mock('@o4o/content-editor', () => ({ RichTextEditor: ({ value, onChange }: { value: string; onChange: (content: { html: string }) => void }) => <textarea aria-label="본문 검사" value={value} onChange={event => onChange({ html: event.target.value })} />, LlmAssistPanel: () => null }));
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); api.store = 'A'; api.slug.mockResolvedValue('fixture'); api.list.mockResolvedValue({ data: [] }); api.create.mockResolvedValue({ id: 'post', title: 'Title', content: 'Body', slug: 'post', status: 'draft' }); });
const tree = () => <MemoryRouter><Blog /></MemoryRouter>;
async function draft() {
  render(tree()); await screen.findByRole('heading', { name: '블로그 관리' });
  fireEvent.click(screen.getByRole('button', { name: '블로그 글 만들기' }));
  fireEvent.change(screen.getByPlaceholderText('게시글 제목'), { target: { value: 'Title' } });
  fireEvent.change(screen.getByLabelText('본문 검사'), { target: { value: 'Body' } });
}
it('slug lookup failure offers retry and never claims the store is unlinked', async () => {
  api.slug.mockRejectedValueOnce(Error('synthetic')); render(tree()); await screen.findByRole('alert');
  expect(screen.queryByText('선택한 매장의 공개 주소가 아직 없습니다')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '매장 연결 다시 시도' })); await screen.findByRole('heading', { name: '블로그 관리' });
});
it('failed blog creation keeps its inputs and a duplicate submit is locked', async () => {
  let reject!: (error: Error) => void;
  api.create.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; })); await draft();
  const button = screen.getByRole('button', { name: '임시 저장' }); fireEvent.click(button); fireEvent.click(button);
  expect(api.create).toHaveBeenCalledOnce(); await act(async () => reject(Error('synthetic'))); await screen.findByRole('alert');
  expect((screen.getByPlaceholderText('게시글 제목') as HTMLInputElement).value).toBe('Title');
  expect((screen.getByLabelText('본문 검사') as HTMLTextAreaElement).value).toBe('Body');
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' })); await screen.findByRole('heading', { name: '블로그 관리' });
});
it('edits made while saving stay in the editor and the next save updates the created post', async () => {
  let resolve!: (value: unknown) => void;
  api.create.mockReturnValueOnce(new Promise(done => { resolve = done; })); await draft();
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
  fireEvent.change(screen.getByPlaceholderText('게시글 제목'), { target: { value: 'Later draft' } });
  await act(async () => resolve({ id: 'post', title: 'Title', content: 'Body', slug: 'post', status: 'draft' }));
  await screen.findByText(/이후 수정한 내용은 아직 저장되지/);
  expect((screen.getByPlaceholderText('게시글 제목') as HTMLInputElement).value).toBe('Later draft');
  api.update.mockResolvedValue({ id: 'post' }); fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  await waitFor(() => expect(api.update).toHaveBeenCalledWith('fixture', 'post', expect.objectContaining({ title: 'Later draft' }), undefined));
  expect(api.create).toHaveBeenCalledOnce();
});
it('store switch remounts the editor before a delayed save can reload the new store', async () => {
  let resolve!: (value: unknown) => void; api.create.mockReturnValue(new Promise(done => { resolve = done; }));
  const { rerender } = render(tree()); await screen.findByRole('heading', { name: '블로그 관리' });
  fireEvent.click(screen.getByRole('button', { name: '블로그 글 만들기' }));
  fireEvent.change(screen.getByPlaceholderText('게시글 제목'), { target: { value: 'Old title' } }); fireEvent.change(screen.getByLabelText('본문 검사'), { target: { value: 'Body' } });
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' })); api.store = 'B'; rerender(tree()); await screen.findByRole('heading', { name: '블로그 관리' });
  const count = api.list.mock.calls.length; await act(async () => resolve({ id: 'old' }));
  expect(api.list).toHaveBeenCalledTimes(count); expect(screen.queryByDisplayValue('Old title')).toBeNull();
});

it('failed settings read cannot overwrite existing settings with empty defaults and offers retry', async () => {
  api.settings.mockRejectedValueOnce(Error('synthetic')).mockResolvedValue({ blogName: 'Saved name', description: '', heroImage: '', defaultTemplate: 'professional' });
  render(tree()); await screen.findByRole('heading', { name: '블로그 관리' }); fireEvent.click(screen.getByRole('button', { name: '블로그 설정' }));
  await screen.findByRole('alert'); expect(screen.queryByRole('button', { name: '저장' })).toBeNull(); expect(api.saveSettings).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '블로그 설정 다시 시도' })); await screen.findByDisplayValue('Saved name');
});

it('a failed post list is not an empty blog and can be retried', async () => {
  api.list.mockRejectedValueOnce(Error('synthetic')); render(tree()); await screen.findByRole('alert');
  expect(screen.queryByText('게시글이 없습니다.')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: '게시글 다시 시도' })); await screen.findByText('게시글이 없습니다.');
});
