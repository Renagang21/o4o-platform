import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Page from './SemiFranchiseContentFormPage';
const api = vi.hoisted(() => ({ getContent: vi.fn(), updateContent: vi.fn(), createContent: vi.fn() }));
vi.mock('./api', () => ({ neturePharmacyOperatorApi: api, STATUS_CLASS: {}, STATUS_LABEL: {} }));
vi.mock('@o4o/content-editor', () => ({ RichTextEditor: ({ value, onChange }: any) => <textarea value={value} onChange={event => onChange({ html: event.target.value })} /> }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
const content = (title: string) => ({ title, status: 'draft', summary: '', body: '', tags: [], semiFranchiseName: '합성 사업', semiFranchiseKey: 'b' });
function Switch({ target }: { target: string }) { const go = useNavigate(), location = useLocation(); return <><button onClick={() => go(target)}>다른 사업</button><output data-testid="path">{location.pathname}</output></>; }
function show(target = '/operator/semi-franchises/b/contents/two/edit') {
  return render(<MemoryRouter initialEntries={['/operator/semi-franchises/a/contents/one/edit']}><Switch target={target} /><Routes><Route path="/operator/semi-franchises/:key/contents/:id/edit" element={<Page />} /><Route path="/operator/semi-franchises/:key/contents/new" element={<Page />} /><Route path="/operator/semi-franchises" element={<p>목록 복귀</p>} /></Routes></MemoryRouter>);
}
it('ignores content fetched for a previous business', async () => {
  let first!: (value: unknown) => void;
  api.getContent.mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce(content('현재 사업'));
  show(); fireEvent.click(screen.getByRole('button', { name: '다른 사업' }));
  await screen.findByDisplayValue('현재 사업');
  await act(async () => first(content('이전 사업')));
  expect(screen.queryByDisplayValue('이전 사업')).toBeNull();
});
it('does not expose a writable blank editor after a failed read', async () => {
  api.getContent.mockRejectedValueOnce(new Error('조회 실패')).mockResolvedValueOnce(content('재시도 결과'));
  show(); await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: '수정 저장' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await screen.findByDisplayValue('재시도 결과');
});
it('an old save cannot redirect a new business draft or preserve the old draft', async () => {
  let finish!: () => void;
  api.getContent.mockResolvedValue(content('이전 초안'));
  api.updateContent.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  show('/operator/semi-franchises/b/contents/new');
  await screen.findByDisplayValue('이전 초안');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  fireEvent.click(screen.getByRole('button', { name: '다른 사업' }));
  await screen.findByRole('button', { name: '초안 저장' });
  await act(async () => finish());
  expect(screen.getByTestId('path').textContent).toBe('/operator/semi-franchises/b/contents/new');
  expect(screen.queryByDisplayValue('이전 초안')).toBeNull();
});

it('preserves edited content after failure and retries the same normalized payload', async () => {
  api.getContent.mockResolvedValue(content('가상 초안'));
  api.updateContent.mockRejectedValueOnce(new Error('저장 실패')).mockResolvedValueOnce({});
  show(); await screen.findByDisplayValue('가상 초안');
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: ' 수정 제목 ' } });
  fireEvent.change(screen.getByLabelText('태그'), { target: { value: ' 첫째, , 둘째 ' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' })); await screen.findByText('저장 실패');
  expect((screen.getByLabelText('제목') as HTMLInputElement).value).toBe(' 수정 제목 ');
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
  await act(async () => {});
  expect(api.updateContent).toHaveBeenCalledTimes(2);
  expect(api.updateContent.mock.calls[0]).toEqual(api.updateContent.mock.calls[1]);
  expect(api.updateContent.mock.calls[0][2]).toMatchObject({ title: '수정 제목', tags: ['첫째', '둘째'] });
});
it('locks fields and own navigation while saving without duplicating the request', async () => {
  let finish!: () => void; api.getContent.mockResolvedValue(content('저장 초안'));
  api.updateContent.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  show(); await screen.findByDisplayValue('저장 초안');
  const button = screen.getByRole('button', { name: '수정 저장' });
  act(() => { fireEvent.click(button); fireEvent.click(button); });
  expect(screen.getByLabelText('제목').closest('fieldset')?.disabled).toBe(true);
  fireEvent.click(screen.getByRole('link', { name: '취소' }));
  expect(screen.getByTestId('path').textContent).toContain('/contents/one/edit');
  expect(api.updateContent).toHaveBeenCalledTimes(1); await act(async () => finish());
});
it('blocks empty title and archived content without a write', async () => {
  api.getContent.mockResolvedValueOnce(content('가상 초안'));
  const view = show(); await screen.findByDisplayValue('가상 초안');
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: ' ' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 저장' })); await screen.findByText('제목을 입력해 주세요.');
  expect(api.updateContent).not.toHaveBeenCalled(); view.unmount();
  api.getContent.mockResolvedValueOnce({ ...content('보관'), status: 'archived' });
  show(); await screen.findByText(/보관되거나 반려된 콘텐츠는 수정할 수 없습니다/);
  expect(screen.queryByRole('button', { name: '수정 저장' })).toBeNull(); expect(api.updateContent).not.toHaveBeenCalled();
});
