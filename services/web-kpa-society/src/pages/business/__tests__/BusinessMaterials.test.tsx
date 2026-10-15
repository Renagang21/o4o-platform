import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), stores: [{ organizationId: 'store-a', organizationName: '약국 A', memberRole: 'owner' }] }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }), authClient: { api: { get: (path: string, config: unknown) => path === '/work-scope/accessible-stores' ? Promise.resolve({ data: { data: { stores: transport.stores } } }) : transport.get(path, config), post: transport.post } } }));
vi.mock('@o4o/content-editor', () => ({ ContentRenderer: ({ html }: { html: string }) => <p>{html}</p> }));
import BusinessMaterialsPage from '../BusinessMaterialsPage';
const item = { id: 'resource', title: '샘플 자료', summary: '샘플 요약', body: '샘플 본문', semiFranchiseKey: 'pharmacy' };
function mount(allowed = true, canManage = false, path = '/materials?content=resource') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<Outlet context={{ business: { key: 'pharmacy' }, access: { allowed, canManage } }} />}><Route path="/materials" element={<BusinessMaterialsPage />} /></Route></Routes></MemoryRouter>);
}
beforeEach(() => { transport.stores = [{ organizationId: 'store-a', organizationName: '약국 A', memberRole: 'owner' }]; transport.get.mockReset(); transport.get.mockResolvedValue({ data: { data: { items: [item], total: 21 } } }); });
afterEach(cleanup);
it('선택한 자료를 바로 펼치고 다른 사업 자료는 표시하지 않는다', async () => {
  transport.get.mockResolvedValue({ data: { data: { items: [item, { ...item, id: 'foreign', title: '다른 사업 자료', semiFranchiseKey: 'other' }], total: 2 } } });
  mount(); const title = await screen.findByText('샘플 자료');
  expect(title.closest('details')?.open).toBe(true); expect(screen.queryByText('다른 사업 자료')).toBeNull();
  expect(transport.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 1, limit: 20 }, headers: { 'X-Store-Organization-Id': 'store-a' } });
});
it('기존 페이지 계약으로 다음 페이지를 조회한다', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: '다음' }));
  await waitFor(() => expect(transport.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 2, limit: 20 }, headers: { 'X-Store-Organization-Id': 'store-a' } }));
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

it('선택한 사업과 자료를 내 매장 이동 경로에 유지한다', async () => {
  transport.post.mockResolvedValue({});
  mount();
  fireEvent.click(await screen.findByRole('button', { name: '내 매장으로 자료 가져오기' }));
  await screen.findByRole('alert');
  expect(transport.post).toHaveBeenCalledWith('/auth/handoff', {
    targetWorkspace: 'store', returnPath: '/store/pharmacy/contents?business=pharmacy&content=resource',
  });
});

it('여러 약국이면 선택 전에 자료를 조회하지 않고 선택 약국 헤더만 보낸다', async () => {
  transport.stores.push({ organizationId: 'store-b', organizationName: '약국 B', memberRole: 'owner' });
  mount();
  const select = await screen.findByRole('combobox', { name: '자료를 이용할 약국' });
  expect(transport.get).not.toHaveBeenCalled();
  fireEvent.change(select, { target: { value: 'store-b' } });
  await screen.findByText('샘플 자료');
  expect(transport.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 1, limit: 20 }, headers: { 'X-Store-Organization-Id': 'store-b' } });
});
it('URL의 약국이 현재 접근 목록에 없으면 다른 약국으로 대체 조회하지 않는다', async () => {
  mount(true, false, '/materials?store=foreign');
  await screen.findByRole('combobox', { name: '자료를 이용할 약국' });
  expect(transport.get).not.toHaveBeenCalled();
});
