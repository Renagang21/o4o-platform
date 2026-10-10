import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
const transport = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ authClient: { api: transport } }));
vi.mock('@o4o/content-editor', () => ({ ContentRenderer: ({ html }: { html: string }) => <p>{html}</p> }));
import BusinessMaterialsPage from '../BusinessMaterialsPage';
const item = { id: 'resource', title: '샘플 자료', summary: '샘플 요약', body: '샘플 본문', semiFranchiseKey: 'pharmacy' };
function mount(allowed = true, canManage = false, path = '/materials?content=resource') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<Outlet context={{ business: { key: 'pharmacy' }, access: { allowed, canManage } }} />}><Route path="/materials" element={<BusinessMaterialsPage />} /></Route></Routes></MemoryRouter>);
}
beforeEach(() => { transport.get.mockReset(); transport.get.mockResolvedValue({ data: { data: { items: [item], total: 21 } } }); });
afterEach(cleanup);
it('선택한 자료를 바로 펼치고 다른 사업 자료는 표시하지 않는다', async () => {
  transport.get.mockResolvedValue({ data: { data: { items: [item, { ...item, id: 'foreign', title: '다른 사업 자료', semiFranchiseKey: 'other' }], total: 2 } } });
  mount(); const title = await screen.findByText('샘플 자료');
  expect(title.closest('details')?.open).toBe(true); expect(screen.queryByText('다른 사업 자료')).toBeNull();
  expect(transport.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 1, limit: 20 } });
});
it('기존 페이지 계약으로 다음 페이지를 조회한다', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: '다음' }));
  await waitFor(() => expect(transport.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 2, limit: 20 } }));
});
it.each([[false, false], [true, true]])('미승인/운영자 자료 화면에서는 소유자 전용 API를 호출하지 않는다 (%s, %s)', async (allowed, canManage) => {
  mount(allowed, canManage); expect(transport.get).not.toHaveBeenCalled();
  if (canManage) expect(screen.getByRole('link', { name: '사업 자료 관리 →' }).getAttribute('href')).toBe('/operator/semi-franchises');
  else expect(screen.getByText('사업 참여 승인 후 자료를 이용할 수 있습니다.')).toBeTruthy();
});
it('조회 실패를 빈 자료로 표시하지 않고 재시도하여 복구한다', async () => {
  transport.get.mockRejectedValueOnce({ response: { data: { error: '샘플 조회 실패' } } }); mount();
  expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.queryByText('등록된 자료가 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); expect(await screen.findByText('샘플 자료')).toBeTruthy();
});
