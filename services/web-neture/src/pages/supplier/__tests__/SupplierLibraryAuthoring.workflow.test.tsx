import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import SupplierLibraryFormPage from '../SupplierLibraryFormPage';
const api = vi.hoisted(() => ({ getLibraryItem: vi.fn(), createLibraryItem: vi.fn(), updateLibraryItem: vi.fn() }));
const session = vi.hoisted(() => ({ user: { id: 'supplier-a' } as { id: string } | null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: session.user }) }));
vi.mock('../../../lib/api', () => ({ supplierApi: api }));
vi.mock('@o4o/content-editor', async importOriginal => ({
  ...(await importOriginal<typeof import('@o4o/content-editor')>()),
  RichTextEditor: ({ value, onChange, editable }: { value: string; onChange: (value: { html: string }) => void; editable?: boolean }) =>
    <textarea aria-label="문서 편집" value={value} disabled={editable === false} onChange={event => onChange({ html: event.target.value })} />,
}));
beforeEach(() => { vi.resetAllMocks(); session.user = { id: 'supplier-a' }; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const documentItem = (title: string) => ({ title, contentType: 'document', description: '합성 참고자료', blocks: [{ type: 'html', content: '<p>기존 문서</p>' }], category: '안내', isPublic: false });
function Switch() { const navigate = useNavigate(); return <button onClick={() => navigate('/supplier/library/new')}>새 문서로 이동</button>; }
function LibraryDestination() { const location = useLocation(); return <p>자료함 목록{location.search}</p>; }
function LibraryRoutes({ path }: { path: string }) {
  return <MemoryRouter initialEntries={[path]}><Switch /><Routes>
    <Route path="/supplier/library/:id/edit" element={<SupplierLibraryFormPage />} />
    <Route path="/supplier/library/new" element={<SupplierLibraryFormPage />} />
    <Route path="/supplier/library" element={<LibraryDestination />} />
  </Routes></MemoryRouter>;
}
function show(path = '/supplier/library/one/edit') {
  const view = render(<LibraryRoutes path={path} />);
  return { ...view, refreshSession: () => view.rerender(<LibraryRoutes path={path} />) };
}
async function applyResult() {
  fireEvent.click(screen.getByRole('button', { name: '외부 AI로 문서 작업' }));
  fireEvent.change(screen.getByLabelText('결과 HTML 붙여넣기'), { target: { value: '<p>확인한 초안</p>' } });
  fireEvent.click(screen.getByRole('button', { name: '결과 미리보기' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '결과와 사실·이용 범위를 확인했습니다' }));
  fireEvent.click(screen.getByRole('button', { name: '편집기에 넣기' }));
  fireEvent.click(screen.getAllByRole('button', { name: '닫기' })[0]);
}
it('applies a reviewed document draft without saving or changing visibility, then uses the existing save payload', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.getLibraryItem.mockResolvedValue(documentItem('자료 제목')); api.updateLibraryItem.mockResolvedValue({ success: true });
  show(); await screen.findByDisplayValue('자료 제목'); await applyResult();
  expect((screen.getByLabelText('문서 편집') as HTMLTextAreaElement).value).toBe('<p>확인한 초안</p>');
  expect(api.updateLibraryItem).not.toHaveBeenCalled();
  expect((screen.getByRole('checkbox', { name: /공개 자료로 등록/ }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' })); await screen.findByText('자료함 목록');
  expect(api.updateLibraryItem).toHaveBeenCalledWith('one', expect.objectContaining({ title: '자료 제목', isPublic: false, blocks: [{ type: 'html', content: '<p>확인한 초안</p>' }] }));
});
it('keeps the draft and releases saving after a rejected request so retry can succeed', async () => {
  api.getLibraryItem.mockResolvedValue(documentItem('재시도 문서'));
  api.updateLibraryItem.mockRejectedValueOnce(Error('fixture')).mockResolvedValueOnce({ success: true });
  show(); await screen.findByDisplayValue('재시도 문서'); fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  await screen.findByText(/작성 내용은 유지됩니다/);
  expect((screen.getByLabelText('문서 편집') as HTMLTextAreaElement).value).toBe('<p>기존 문서</p>');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' })); await screen.findByText('자료함 목록');
  expect(api.updateLibraryItem).toHaveBeenCalledTimes(2);
});
it('disables authoring while the save is pending and does not submit twice', async () => {
  let finish!: (value: unknown) => void; api.getLibraryItem.mockResolvedValue(documentItem('저장 문서'));
  api.updateLibraryItem.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show(); await screen.findByDisplayValue('저장 문서'); const save = screen.getByRole('button', { name: '수정 저장' });
  fireEvent.click(save); fireEvent.click(save);
  expect(api.updateLibraryItem).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('button', { name: '외부 AI로 문서 작업' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish({ success: true }));
});
it('does not hydrate a new document with a late response for the previous route', async () => {
  let finish!: (value: unknown) => void; api.getLibraryItem.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show(); fireEvent.click(screen.getByRole('button', { name: '새 문서로 이동' }));
  fireEvent.change(screen.getByPlaceholderText('자료 제목을 입력하세요'), { target: { value: '새 자료 제목' } });
  await act(async () => finish(documentItem('이전 자료 제목')));
  expect(screen.getByDisplayValue('새 자료 제목')).toBeTruthy(); expect(screen.queryByDisplayValue('이전 자료 제목')).toBeNull();
});
it('does not redirect a new draft after a previous route save completes', async () => {
  let finish!: (value: unknown) => void; api.getLibraryItem.mockResolvedValue(documentItem('이전 문서'));
  api.updateLibraryItem.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show(); await screen.findByDisplayValue('이전 문서'); fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  fireEvent.click(screen.getByRole('button', { name: '새 문서로 이동' }));
  fireEvent.change(screen.getByPlaceholderText('자료 제목을 입력하세요'), { target: { value: '작성 중' } });
  await act(async () => finish({ success: true }));
  expect(screen.getByDisplayValue('작성 중')).toBeTruthy(); expect(screen.queryByText('자료함 목록')).toBeNull();
});
it('does not expose a writable empty form after failed read and supports a read retry', async () => {
  api.getLibraryItem.mockRejectedValueOnce(Error('fixture')).mockResolvedValueOnce(documentItem('다시 읽은 문서'));
  show(); await screen.findByText('자료 정보를 불러오지 못했습니다.');
  expect(screen.queryByRole('button', { name: '수정 저장' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); await screen.findByDisplayValue('다시 읽은 문서');
  expect(api.updateLibraryItem).not.toHaveBeenCalled();
});
it('offers document authoring only for document content and retains manual creation', async () => {
  show('/supplier/library/new'); expect(screen.queryByRole('button', { name: '외부 AI로 문서 작업' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '문서 (Document)' }));
  fireEvent.change(screen.getByPlaceholderText('자료 제목을 입력하세요'), { target: { value: '수동 문서' } });
  fireEvent.change(screen.getByLabelText('문서 편집'), { target: { value: '<p>직접 작성</p>' } });
  api.createLibraryItem.mockResolvedValue({ success: true }); fireEvent.click(screen.getByRole('button', { name: '등록' }));
  await waitFor(() => expect(api.createLibraryItem).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'document', isPublic: false })));
});

it('discards document and external AI drafts on account replacement and logout', async () => {
  api.getLibraryItem.mockResolvedValueOnce(documentItem('이전 계정 문서')).mockResolvedValueOnce(documentItem('현재 계정 문서'));
  const view = show(); await screen.findByDisplayValue('이전 계정 문서');
  fireEvent.click(screen.getByRole('button', { name: '외부 AI로 문서 작업' }));
  fireEvent.change(screen.getByLabelText('결과 HTML 붙여넣기'), { target: { value: '<p>이전 초안</p>' } });
  session.user = { id: 'supplier-b' };
  view.refreshSession();
  await screen.findByDisplayValue('현재 계정 문서');
  expect(screen.queryByDisplayValue('이전 계정 문서')).toBeNull(); expect(screen.queryByRole('dialog')).toBeNull();
  session.user = null;
  view.refreshSession();
  expect(screen.queryByPlaceholderText('자료 제목을 입력하세요')).toBeNull();
});

it('returns a saved original to the same source and business request without submitting a review', async () => {
  const destination = '/supplier/library?requestSource=one&business=carepharm';
  api.getLibraryItem.mockResolvedValue(documentItem('반려 원본'));
  api.updateLibraryItem.mockResolvedValue({ success: true });
  show('/supplier/library/one/edit?returnTo=' + encodeURIComponent(destination));
  await screen.findByDisplayValue('반려 원본');
  fireEvent.change(screen.getByPlaceholderText('자료 제목을 입력하세요'), { target: { value: '보완 원본' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  await screen.findByText('자료함 목록?requestSource=one&business=carepharm');
  expect(api.updateLibraryItem).toHaveBeenCalledWith('one', expect.objectContaining({ title: '보완 원본', isPublic: false }));
});
