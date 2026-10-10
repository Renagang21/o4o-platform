import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), user: { id: 'owner' } as { id: string } | null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, isLoading: false }), authClient: { api: { get: mocks.get, post: mocks.post } } }));
import BusinessWorkspace from '../BusinessWorkspace';
import BusinessParticipationPage from '../BusinessParticipationPage';
import BusinessMaterialsPage from '../BusinessMaterialsPage';
import { BusinessForumBoundary } from '../BusinessForumPage';

const business = { key: 'pharmacy', name: '약국 협력사업', communityKey: 'business-forum', registrationConditions: '참여 조건' };
const access = { kind: 'semi-franchise', businessKey: 'pharmacy', allowed: false, canManage: false };
const response = (data: unknown) => ({ data: { data } });
const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/businesses/:businessKey" element={<BusinessWorkspace />}>
    <Route path="participation" element={<BusinessParticipationPage />} />
    <Route path="materials" element={<BusinessMaterialsPage />} />
    <Route path="forum" element={<BusinessForumBoundary />}><Route index element={<p>게시판 데이터 화면</p>} /></Route>
  </Route>
  <Route path="/login" element={<p>로그인 화면</p>} />
</Routes></MemoryRouter>);
beforeEach(() => {
  mocks.user = { id: 'owner' }; mocks.get.mockReset(); mocks.post.mockReset();
  mocks.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/businesses/pharmacy')) return response(business);
    if (path.endsWith('/access')) return response(access);
    if (path.endsWith('/semi-franchises')) return response([{ key: 'pharmacy', membershipStatus: null }]);
    throw new Error(`Unexpected request ${path}`);
  });
});
afterEach(cleanup);
describe('사업 서비스의 참가자 공간', () => {
  it('미로그인은 신청도 로그인 진입으로 보내고 자원 조회를 하지 않는다', async () => {
    mocks.user = null; mount('/businesses/pharmacy/participation');
    expect(await screen.findByText('로그인 화면')).toBeTruthy(); expect(mocks.get).not.toHaveBeenCalled();
  });
  it('미승인 사용자는 사업 정보와 신청을 보되 게시판 내용은 보지 못한다', async () => {
    mount('/businesses/pharmacy/forum');
    expect(await screen.findByText('사업 참여 승인 후 게시판을 이용할 수 있습니다.')).toBeTruthy();
    expect(screen.queryByText('게시판 데이터 화면')).toBeNull();
    expect(mocks.get.mock.calls.every(([path]) => !path.includes('/forum/posts'))).toBe(true);
  });
  it('승인 사용자는 해당 사업의 게시판을 이용한다', async () => {
    mocks.get.mockImplementation(async (path: string) => response(path.endsWith('/access') ? { ...access, allowed: true } : business));
    mount('/businesses/pharmacy/forum'); expect(await screen.findByText('게시판 데이터 화면')).toBeTruthy();
  });
  it('사업과 게시판의 소속이 다르면 내용을 표시하지 않는다', async () => {
    mocks.get.mockImplementation(async (path: string) => response(path.endsWith('/access') ? { ...access, allowed: true, businessKey: 'other' } : business));
    mount('/businesses/pharmacy/forum'); expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('게시판 데이터 화면')).toBeNull();
  });
  it('가입 상태 조회 실패를 미가입으로 안내하거나 신청으로 우회하지 않는다', async () => {
    const initial = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((path: string) => path.endsWith('/semi-franchises') ? Promise.reject(new Error('Unavailable')) : initial(path));
    mount('/businesses/pharmacy/participation'); expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('아직 참여 신청하지 않았습니다.')).toBeNull();
    expect(screen.queryByRole('button', { name: '참여 신청' })).toBeNull();
  });
  it('조건 확인 후 기존 신청 API에 해당 사업의 신청만 전달한다', async () => {
    mocks.post.mockResolvedValue(response({ status: 'pending' })); mount('/businesses/pharmacy/participation');
    const check = await screen.findByRole('checkbox'); fireEvent.click(check);
    fireEvent.click(screen.getByRole('button', { name: '참여 신청' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/neture/pharmacy/semi-franchises/pharmacy/apply', {
      acceptedConditions: true, conditions: '참여 조건', note: '',
    }));
  });
  it('담당 운영자에게 약국 소유자 전용 가입 조회를 요구하지 않는다', async () => {
    mocks.get.mockImplementation(async (path: string) => response(path.endsWith('/access') ? { ...access, allowed: true, canManage: true } : business));
    mount('/businesses/pharmacy/participation'); expect(await screen.findByText('이 사업의 담당 운영자입니다.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '사업 운영 · 가입 심사' })).toBeTruthy();
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/semi-franchises'))).toBe(false);
  });
  it('미승인 사용자는 사업 자료 API를 호출하지 않는다', async () => {
    mount('/businesses/pharmacy/materials'); expect(await screen.findByText('사업 참여 승인 후 자료를 이용할 수 있습니다.')).toBeTruthy();
    expect(mocks.get.mock.calls.some(([path]) => path.includes('/store/contents'))).toBe(false);
  });
});


describe('게시판 미개설 사업의 권한', () => {
  it('승인된 참가자는 게시판 연결 없이도 사업 자료를 조회한다', async () => {
    mocks.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/businesses/pharmacy')) return response({ ...business, communityKey: 'business:pharmacy' });
      if (path.endsWith('/communities/business%3Apharmacy/access')) return response({ ...access, allowed: true });
      if (path.endsWith('/store/contents')) return response({ items: [], total: 0 });
      throw new Error(`Unexpected request ${path}`);
    });
    mount('/businesses/pharmacy/materials');
    expect(await screen.findByText('등록된 자료가 없습니다.')).toBeTruthy();
    expect(mocks.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 1, limit: 20 } });
    expect(screen.queryByText('사업 참여 승인 후 자료를 이용할 수 있습니다.')).toBeNull();
  });
  it('미승인 참가자의 자료 접근은 게시판 미개설 상태에서도 차단한다', async () => {
    mocks.get.mockImplementation(async (path: string) => response(path.endsWith('/access') ? access : { ...business, communityKey: 'business:pharmacy' }));
    mount('/businesses/pharmacy/materials');
    expect(await screen.findByText('사업 참여 승인 후 자료를 이용할 수 있습니다.')).toBeTruthy();
    expect(mocks.get.mock.calls.some(([path]) => path.includes('/store/contents'))).toBe(false);
  });
  it('담당 운영자는 게시판 연결 없이 운영 화면을 이용하고 소유자 전용 조회를 하지 않는다', async () => {
    mocks.get.mockImplementation(async (path: string) => response(path.endsWith('/access') ? { ...access, allowed: true, canManage: true } : { ...business, communityKey: 'business:pharmacy' }));
    mount('/businesses/pharmacy/participation');
    expect(await screen.findByText('이 사업의 담당 운영자입니다.')).toBeTruthy();
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/semi-franchises'))).toBe(false);
  });
});
