import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ user: { id: 'member' } as { id: string } | null, get: vi.fn(), handoff: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, isLoading: false }), authClient: { api: { get: mocks.get } } }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: mocks.handoff }));
import BusinessWorkspace from '../BusinessWorkspace';
import PharmacyMemberHomePage from '../PharmacyMemberHomePage';
import PharmacyLegacyRedirect, { LegacyAwareBusinessWorkspace, pharmacyLegacyPath } from '../PharmacyLegacyRedirect';

const business = { key: 'pharmacy', name: 'pharmacy', communityKey: 'business:pharmacy', registrationConditions: '' };
let access = { kind: 'semi-franchise', businessKey: 'pharmacy', allowed: true, canManage: false };
const post = (id: string, pinned = false) => ({ id, slug: id, title: pinned ? '게시된 실제 공지' : '회원의 실제 이야기',
  type: 'discussion', isPinned: pinned, author: { nickname: '샘플 회원' }, createdAt: '2026-10-10T00:00:00Z', commentCount: 2 });
function Destination() { const location = useLocation(); return <output data-testid="destination">{location.pathname + location.search + location.hash}</output>; }
const tree = (path: string) => <MemoryRouter initialEntries={[path]}><Routes>
  <Route element={<BusinessWorkspace defaultBusinessKey="pharmacy" memberLayout />}><Route path="/" element={<PharmacyMemberHomePage />} /></Route>
  <Route path="/businesses/pharmacy/*" element={<PharmacyLegacyRedirect />} />
  <Route path="/businesses/:businessKey" element={<LegacyAwareBusinessWorkspace />}>
    <Route path="forum/post/:slug" element={<p>전환되지 않은 이전 게시글 화면</p>} />
  </Route>
  <Route path="*" element={<Destination />} />
</Routes></MemoryRouter>;
beforeEach(() => {
  mocks.user = { id: 'member' }; access = { ...access, allowed: true, canManage: false }; mocks.get.mockReset(); mocks.handoff.mockReset();
  mocks.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/businesses/pharmacy')) return { data: { data: business } };
    if (path.endsWith('/access')) return { data: { data: access } };
    if (path.endsWith('/forum/posts')) return { data: { data: [post('notice', true), post('conversation')] } };
    if (path.endsWith('/store/contents')) return { data: { data: { items: [
      { id: 'guide', title: '게시된 실제 자료', summary: '사업 자료 요약', semiFranchiseKey: 'pharmacy' },
      { id: 'foreign', title: '다른 사업 자료', semiFranchiseKey: 'other' },
    ] } } };
    throw new Error(`Unexpected request ${path}`);
  });
});
afterEach(cleanup);

describe('약국 회원 초기화면', () => {
  it('루트에 Hero와 실제 공지·게시글·자료를 바로 표시하고 신청 화면을 거치지 않는다', async () => {
    render(tree('/'));
    expect(await screen.findByText('회원의 실제 이야기')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('더 나은 약국 경영');
    expect(screen.getByText('게시된 실제 공지')).toBeTruthy();
    expect(await screen.findByText('사업 자료 요약')).toBeTruthy();
    expect(screen.queryByText('다른 사업 자료')).toBeNull();
    expect(screen.queryByText('참여 신청 · 이용 상태')).toBeNull();
    expect(screen.getByRole('link', { name: '회원의 실제 이야기' }).getAttribute('href')).toBe('/community/post/conversation');
    expect(screen.getByRole('link', { name: '게시된 실제 자료' }).getAttribute('href')).toBe('/materials?content=guide');
    expect(mocks.get).toHaveBeenCalledWith('/communities/business%3Apharmacy/forum/posts', { params: { page: 1, limit: 20, sortBy: 'latest' } });
    expect(mocks.get).toHaveBeenCalledWith('/neture/pharmacy/store/contents', { params: { sf: 'pharmacy', page: 1, limit: 3 } });
  });
  it('미로그인은 원래 루트로 복귀하는 로그인으로 보내고 회원 데이터를 조회하지 않는다', async () => {
    mocks.user = null; render(tree('/'));
    expect(await screen.findByTestId('destination')).toHaveProperty('textContent', '/login?returnTo=%2F');
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('미승인 사용자에게 Hero·신청 안내만 제공하고 회원 데이터 조회를 하지 않는다', async () => {
    access.allowed = false; render(tree('/'));
    expect(await screen.findByRole('heading', { name: '참여 신청 · 이용 안내' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '참여 신청 · 상태 확인 →' }).getAttribute('href')).toBe('/my/participation');
    expect(mocks.get.mock.calls.some(([path]) => path.includes('/forum/posts') || path.includes('/store/contents'))).toBe(false);
  });
  it('운영자에게 회원 게시글과 관리 링크를 제공하고 소유자 전용 자료 API를 호출하지 않는다', async () => {
    access.canManage = true; render(tree('/'));
    expect(await screen.findByText('게시된 실제 공지')).toBeTruthy();
    expect(screen.getByRole('link', { name: '사업 운영 · 회원 관리' }).getAttribute('href')).toBe('/operator/semi-franchises');
    expect(mocks.get.mock.calls.some(([path]) => path.includes('/store/contents'))).toBe(false);
  });
  it('자료 실패를 빈 자료로 표시하지 않고 게시글과 독립적으로 재시도한다', async () => {
    const original = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((path: string, config: unknown) => path.endsWith('/store/contents') ? Promise.reject(new Error('Offline')) : original(path, config));
    render(tree('/'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('회원의 실제 이야기')).toBeTruthy();
    expect(screen.queryByText('등록된 사업 자료가 없습니다.')).toBeNull();
    const postRequests = mocks.get.mock.calls.filter(([path]) => path.endsWith('/forum/posts')).length;
    mocks.get.mockImplementation(original);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('게시된 실제 자료')).toBeTruthy();
    expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/forum/posts')).length).toBe(postRequests);
  });
  it('사업 조회의 응답 키가 다르면 회원 정보를 표시하지 않는다', async () => {
    mocks.get.mockResolvedValue({ data: { data: { ...business, key: 'other' } } }); render(tree('/'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(mocks.get.mock.calls).toHaveLength(1);
  });
  it('계정이 바뀔 때 이전 회원의 게시글을 표시하지 않는다', async () => {
    const result = render(tree('/'));
    expect(await screen.findByText('회원의 실제 이야기')).toBeTruthy();
    const original = mocks.get.getMockImplementation()!;
    mocks.user = { id: 'other-member' };
    mocks.get.mockImplementation((path: string, config: unknown) => path.endsWith('/businesses/pharmacy') ? new Promise(() => {}) : original(path, config));
    result.rerender(tree('/'));
    expect(screen.queryByText('회원의 실제 이야기')).toBeNull();
    expect(screen.getByText('사업 정보를 확인하고 있습니다…')).toBeTruthy();
  });
  it('게시글 조회 실패와 정상 빈 목록을 구분하며 자료는 계속 표시한다', async () => {
    const original = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((path: string, config: unknown) => path.endsWith('/forum/posts') ? Promise.reject(new Error('Offline')) : original(path, config));
    render(tree('/'));
    expect(await screen.findByText('게시된 실제 자료')).toBeTruthy();
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.queryByText('최근 목록에 등록된 공지가 없습니다.')).toBeNull();
    mocks.get.mockImplementation((path: string, config: unknown) => path.endsWith('/forum/posts') ? Promise.resolve({ data: { data: [] } }) : original(path, config));
    fireEvent.click(screen.getAllByRole('button', { name: '다시 시도' })[0]);
    expect(await screen.findByText('최근 목록에 등록된 공지가 없습니다.')).toBeTruthy();
    expect(screen.getByText('최근 목록에 회원 게시글이 없습니다.')).toBeTruthy();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
  it('내 매장 이동 실패를 안내하고 다시 실행할 수 있게 한다', async () => {
    mocks.handoff.mockRejectedValue(new Error('No organization')); render(tree('/'));
    fireEvent.click(await screen.findByRole('button', { name: '내 매장으로' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '내 매장으로 이동하지 못했습니다. 매장 소속과 승인 상태를 확인해 주세요.');
    await waitFor(() => expect(screen.getByRole('button', { name: '내 매장으로' })).toHaveProperty('disabled', false));
    expect(mocks.handoff).toHaveBeenCalledWith({ get: mocks.get }, { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: '/store' });
  });
  it('이전 상세 URL은 query/hash를 보존해 실제 회원 콘텐츠 URL로 연결한다', async () => {
    render(tree('/businesses/pharmacy/forum/post/example?page=2#comments'));
    expect(await screen.findByTestId('destination')).toHaveProperty('textContent', '/community/post/example?page=2#comments');
    expect(screen.queryByText('전환되지 않은 이전 게시글 화면')).toBeNull();
  });
  it.each([
    ['/businesses/pharmacy', '/'], ['/businesses/pharmacy/participation', '/my/participation'],
    ['/businesses/pharmacy/materials', '/materials'], ['/businesses/pharmacy/tools', '/tools'],
    ['/businesses/pharmacy/forum/owned/board/members', '/community/owned/board/members'],
  ])('이전 주소 %s를 %s로 전환한다', (old, next) => expect(pharmacyLegacyPath(old)).toBe(next));
});
