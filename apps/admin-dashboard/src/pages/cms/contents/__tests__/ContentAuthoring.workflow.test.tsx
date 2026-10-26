import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContentFormModal from '../ContentFormModal';
const api = vi.hoisted(() => ({ updateContent: vi.fn(), createContent: vi.fn() }));
vi.mock('@/lib/cms', () => ({ default: api }));
vi.mock('@/api/media-library.api', () => ({ uploadImageForEditor: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@o4o/content-editor', async importOriginal => ({
  ...(await importOriginal<typeof import('@o4o/content-editor')>()),
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (value: { html: string }) => void }) =>
    <textarea aria-label="CMS 본문 편집" value={value} onChange={event => onChange({ html: event.target.value })} />,
}));
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
const fixture = { id: 'fixture', type: 'knowledge', title: '운영 자료', body: '<p>기존 내용</p>', serviceKey: 'neture', summary: '참고 요약', metadata: { creatorType: 'operator' }, attachments: [{ name: '합성 자료', url: 'https://example.invalid/file', type: 'pdf' }] } as any;
it('applies a reviewed result without saving, then preserves the canonical body, metadata and attachment contract', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true); api.updateContent.mockResolvedValue({});
  const onSave = vi.fn(); render(<ContentFormModal content={fixture} onSave={onSave} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '외부 AI로 콘텐츠 작업' }));
  fireEvent.change(screen.getByLabelText('결과 HTML 붙여넣기'), { target: { value: '<p>확인한 운영 자료</p>' } });
  fireEvent.click(screen.getByRole('button', { name: '결과 미리보기' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '결과와 사실·이용 범위를 확인했습니다' }));
  fireEvent.click(screen.getByRole('button', { name: '편집기에 넣기' }));
  expect(api.updateContent).not.toHaveBeenCalled(); expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button', { name: '닫기' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(api.updateContent).toHaveBeenCalledWith('fixture', expect.objectContaining({ body: '<p>확인한 운영 자료</p>', bodyBlocks: expect.any(Array), metadata: fixture.metadata, attachments: fixture.attachments }));
});
it('does not enable authoring for unhydrated content', () => {
  const { body, ...projection } = fixture;
  render(<ContentFormModal content={projection} onSave={vi.fn()} onClose={vi.fn()} />);
  expect((screen.getByRole('button', { name: '외부 AI로 콘텐츠 작업' }) as HTMLButtonElement).disabled).toBe(true);
});
it('drops the external AI session when the CMS service scope changes', () => {
  render(<ContentFormModal content={fixture} onSave={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '외부 AI로 콘텐츠 작업' }));
  fireEvent.change(screen.getByLabelText('결과 HTML 붙여넣기'), { target: { value: '<p>이전 서비스</p>' } });
  fireEvent.click(screen.getAllByRole('button', { name: '닫기' })[0]);
  const select = document.querySelector('select[name="serviceKey"]')!;
  fireEvent.change(select, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '외부 AI로 콘텐츠 작업' }));
  expect((screen.getByLabelText('결과 HTML 붙여넣기') as HTMLTextAreaElement).value).toBe('');
});
