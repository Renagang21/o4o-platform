/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 개별 커뮤니티 운영자의 가입 심사 화면.
 *   - 목록은 `GET /communities/operating`(세션 사용자가 운영하는 커뮤니티)만 쓴다
 *   - 심사 요청은 `/communities/:slug/memberships*` 로 나가고, 판정(403 등)은 backend 메시지를 그대로 보인다
 *   - 이메일은 가린 값만 보인다 · 정지 신청자는 승인 버튼을 열지 않는다
 *   - 비로그인은 목록을 부르지 않는다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const authState = {
  user: { id: 'op1', email: 'op@example.test', name: '운영자', roles: ['user'] } as
    | { id: string; email: string; name: string; roles: string[] }
    | null,
};
vi.mock('../../../contexts', () => ({
  useAuth: () => ({ user: authState.user, isAuthenticated: !!authState.user, isLoading: false }),
}));
vi.mock('../../../contexts/LoginModalContext', () => ({ useLoginModal: () => ({ openLoginModal: vi.fn() }) }));
vi.mock('@o4o/account-ui', () => ({
  MyPageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MyPageLoadingState: () => <p>loading</p>,
  MyPageAuthRequired: ({ description }: { description: string }) => <p>{description}</p>,
}));

const get = vi.fn();
const post = vi.fn();
vi.mock('../../../lib/apiClient', () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

import MyCommunityOperatorPage from '../MyCommunityOperatorPage';
import { canApproveJoin } from '../../../lib/api/communityOperator';

const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });

function mount() {
  return render(
    <MemoryRouter>
      <MyCommunityOperatorPage />
    </MemoryRouter>,
  );
}

const pendingRows = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'member',
    status: 'pending',
    createdAt: '2026-09-01T00:00:00Z',
    name: '홍길동',
    emailMasked: 'ho***@example.com',
    serviceMembershipStatus: 'active',
  },
  {
    id: 'm2',
    userId: 'u2',
    role: 'member',
    status: 'pending',
    createdAt: '2026-09-02T00:00:00Z',
    name: '정지회원',
    emailMasked: 'su***@example.com',
    serviceMembershipStatus: 'suspended',
  },
];

describe('MyCommunityOperatorPage', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    authState.user = { id: 'op1', email: 'op@example.test', name: '운영자', roles: ['user'] };
    get.mockReset();
    post.mockReset();
    get.mockImplementation((url: string) => {
      if (url === '/communities/operating') return ok({ communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 2 }] });
      if (url === '/communities/alpha/memberships') return ok({ memberships: pendingRows });
      return Promise.reject(new Error(`unexpected ${url}`));
    });
    post.mockImplementation(() => ok({}));
  });

  it('비로그인은 운영 목록을 부르지 않는다', () => {
    authState.user = null;
    mount();
    expect(get).not.toHaveBeenCalled();
    expect(screen.getByText(/로그인 후 이용/)).toBeTruthy();
  });

  it('운영하는 커뮤니티의 pending 신청만 조회하고, 이메일은 가린 값만 보인다', async () => {
    mount();
    await screen.findByText('홍길동');
    expect(get).toHaveBeenCalledWith('/communities/operating');
    expect(get).toHaveBeenCalledWith('/communities/alpha/memberships', { params: { status: 'pending', q: '', page: 1, pageSize: 20 } });
    expect(screen.getByText('ho***@example.com')).toBeTruthy();
  });

  it('정지 신청자는 승인 버튼을 열지 않는다 (거절은 가능)', async () => {
    mount();
    await screen.findByText('정지회원');
    const approveButtons = screen.getAllByRole('button', { name: '승인' }) as HTMLButtonElement[];
    expect(approveButtons[0].disabled).toBe(false);
    expect(approveButtons[1].disabled).toBe(true);
    const rejectButtons = screen.getAllByRole('button', { name: '거절' }) as HTMLButtonElement[];
    expect(rejectButtons[1].disabled).toBe(false);
  });

  it.each(['withdrawn', 'rejected', 'pending'])('서비스 %s 신청자는 승인 버튼을 막고 거절은 허용한다', async (status) => {
    get.mockImplementation((url: string) => {
      if (url === '/communities/operating') return ok({ communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 1 }] });
      return ok({ memberships: [{ ...pendingRows[0], serviceMembershipStatus: status }] });
    });
    mount();
    await screen.findByText('홍길동');
    const approve = screen.getByRole('button', { name: '승인' }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(approve.title).toContain('서비스 회원 관리');
    expect((screen.getByRole('button', { name: '거절' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('승인은 그 커뮤니티 slug 의 개체 경로로 나간다', async () => {
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: '승인' }))[0]);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/communities/alpha/memberships/m1/approve'));
    expect(await screen.findByText(/가입을 승인했습니다/)).toBeTruthy();
  });

  it('반려 입력의 취소는 요청하지 않고 확인 시 사유를 함께 보낸다', async () => {
    mount();
    const reject = (await screen.findAllByRole('button', { name: '거절' }))[0];
    fireEvent.click(reject);
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: '취소할 사유' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(reject);
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: '  중복 가입  ' } });
    fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/communities/alpha/memberships/m1/reject', { reason: '중복 가입' }));
    expect(await screen.findByText(/가입 신청을 반려했습니다/)).toBeTruthy();
  });

  it('backend 거부(403 등)는 삼키지 않고 그 메시지를 보인다', async () => {
    post.mockImplementation(() =>
      Promise.reject({ response: { data: { success: false, error: '이 커뮤니티의 운영자만 할 수 있습니다.', code: 'COMMUNITY_OPERATOR_REQUIRED' } } }),
    );
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: '승인' }))[0]);
    expect(await screen.findByText('이 커뮤니티의 운영자만 할 수 있습니다.')).toBeTruthy();
  });

  it('상태·검색·페이지를 직접 바꾸면 이전 처리 실패·성공 문구를 지운다', async () => {
    const initial = get.getMockImplementation()!;
    get.mockImplementation((url: string, config: { params?: { page?: number; pageSize?: number } } = {}) => {
      if (!url.endsWith('/memberships')) return initial(url);
      const { page = 1, pageSize = 20 } = config.params ?? {};
      return ok({ memberships: pendingRows, pagination: { page, pageSize, total: 41, totalPages: 3 } });
    });
    post.mockImplementationOnce(() => Promise.reject({ response: { data: { error: '이 커뮤니티의 운영자만 할 수 있습니다.' } } }));
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: '승인' }))[0]);
    expect(await screen.findByText('이 커뮤니티의 운영자만 할 수 있습니다.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'active' } });
    await waitFor(() => expect(screen.queryByText('이 커뮤니티의 운영자만 할 수 있습니다.')).toBeNull());

    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'pending' } });
    fireEvent.click((await screen.findAllByRole('button', { name: '승인' }))[0]);
    expect(await screen.findByText(/가입을 승인했습니다/)).toBeTruthy();
    await waitFor(() => expect((screen.getByRole('button', { name: '다음 페이지' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    await waitFor(() => expect(screen.queryByText(/가입을 승인했습니다/)).toBeNull());
  });

  it('운영자로 지정된 커뮤니티가 없으면 심사 목록을 부르지 않는다', async () => {
    get.mockImplementation((url: string) =>
      url === '/communities/operating' ? ok({ communities: [] }) : Promise.reject(new Error(url)),
    );
    mount();
    expect(await screen.findByText('운영자로 지정된 커뮤니티가 없습니다.')).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('운영 목록 조회 실패는 빈 목록으로 삼키지 않는다', async () => {
    get.mockImplementation(() => Promise.reject({ response: { data: { error: '인증이 필요합니다.' } } }));
    mount();
    expect(await screen.findByText('인증이 필요합니다.')).toBeTruthy();
    expect(screen.queryByText('운영자로 지정된 커뮤니티가 없습니다.')).toBeNull();
  });

  it.each([true, false])('제재 권한 %s: 활성 회원은 admin만 정지한다', async canRestrictMembers => {
    get.mockImplementation((url: string, options?: { params?: { status?: string } }) => {
      if (url === '/communities/operating') return ok({ communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 2, canRestrictMembers }] });
      return ok({ memberships: options?.params?.status === 'active' ? [{ ...pendingRows[0], name: '활성회원', status: 'active' }] : pendingRows });
    });
    mount(); await screen.findByText('홍길동');
    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'active' } });
    await screen.findByText('활성회원');
    expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
    if (!canRestrictMembers) {
      expect(screen.queryByRole('button', { name: '정지', exact: true })).toBeNull();
      expect(screen.queryByRole('button', { name: '커뮤니티 탈퇴' })).toBeNull();
      return;
    }
    fireEvent.click(screen.getByRole('button', { name: '정지', exact: true }));
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: '회원 관리 사유' } });
    fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/communities/alpha/memberships/m1/suspend', { reason: '회원 관리 사유' }));
    expect(await screen.findByText('활성회원 님을 정지했습니다.')).toBeTruthy();
  });

  it('상태를 변경하면 늦게 도착한 이전 필터 결과를 표시하지 않는다', async () => {
    let release!: (value: unknown) => void;
    const pending = new Promise(resolve => { release = resolve; });
    get.mockImplementation((url: string, config?: { params?: { status?: string } }) => url.endsWith('/operating') ? ok({ communities: [{ id: 'c1', slug: 'fixture', name: '커뮤니티', pendingCount: 1, canRestrictMembers: true }] })
      : config?.params?.status === 'pending' ? pending : ok({ memberships: [{ ...pendingRows[0], status: 'active', name: '활성 회원' }] }));
    mount(); fireEvent.change(await screen.findByLabelText('회원 상태'), { target: { value: 'active' } });
    await screen.findByText('활성 회원');
    await act(async () => release({ data: { success: true, data: { memberships: pendingRows } } }));
    expect(screen.queryByText(pendingRows[0].name)).toBeNull(); expect(screen.getByText('활성 회원')).toBeTruthy();
  });
  it('다른 행의 중복 처리를 막고 상태 변경을 잠근다', async () => {
    let release!: (value: unknown) => void;
    post.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    get.mockImplementation((url: string) => url.endsWith('/operating') ? ok({ communities: [{ id: 'c1', slug: 'fixture', name: '커뮤니티', pendingCount: 2, canRestrictMembers: true }] })
      : ok({ memberships: pendingRows.map(row => ({ ...row, serviceMembershipStatus: 'active' })) }));
    mount(); const buttons = await screen.findAllByRole('button', { name: '승인' });
    fireEvent.click(buttons[0]); fireEvent.click(buttons[1]); expect(post).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('회원 상태') as HTMLSelectElement).disabled).toBe(true);
    await act(async () => release({ data: { success: true, data: {} } }));
    await screen.findByRole('status');
  });
  it('조회 실패는 오류와 재시도를 제공한다', async () => {
    get.mockRejectedValueOnce(new Error('목록 조회 실패'));
    mount(); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    expect(await screen.findByLabelText('회원 상태')).toBeTruthy();
  });

  it('다른 상태로 이동하면 이전 회원의 늦은 이력 응답을 표시하지 않는다', async () => {
    let release!: (value: unknown) => void;
    const history = new Promise(resolve => { release = resolve; });
    get.mockImplementation((url: string) => url.endsWith('/operating') ? ok({ communities: [{ id: 'c1', slug: 'fixture', name: '커뮤니티', pendingCount: 0, canRestrictMembers: true }] })
      : url.endsWith('/history') ? history : ok({ memberships: [{ ...pendingRows[0], status: 'active' }] }));
    mount(); fireEvent.click(await screen.findByRole('button', { name: '이력' }));
    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'suspended' } });
    await act(async () => release({ data: { success: true, data: { changes: [{ id: 'h1', created_at: '2026-10-11T00:00:00Z', reason: '이전 이력', after_role: 'member', after_status: 'active' }] } } }));
    expect(screen.queryByText('이전 이력')).toBeNull();
  });

  it('다음 페이지와 이름 검색·상태·크기 변경을 서버에 전달하고 첫 페이지로 돌아간다', async () => {
    const initial = get.getMockImplementation()!;
    get.mockImplementation((url: string, config: { params?: { q?: string; page?: number; pageSize?: number; status?: string } } = {}) => {
      if (!url.endsWith('/memberships')) return initial(url);
      const { page = 1, pageSize = 20, q = '', status } = config.params!;
      return ok({ memberships: [{ ...pendingRows[0], name: `${q || '회원'}-${page}`, status }], pagination: { page, pageSize, total: 41, totalPages: Math.ceil(41 / pageSize) } });
    });
    mount(); await screen.findByText('회원-1');
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    await screen.findByText('회원-2');
    fireEvent.change(screen.getByLabelText('이름 검색'), { target: { value: ' 대상 ' } });
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    await screen.findByText('대상-1');
    expect(get).toHaveBeenLastCalledWith('/communities/alpha/memberships', { params: { q: '대상', page: 1, pageSize: 20, status: 'pending' } });
    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'active' } });
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/communities/alpha/memberships', { params: { q: '대상', page: 1, pageSize: 20, status: 'active' } }));
    fireEvent.change(screen.getByLabelText('페이지 크기'), { target: { value: '50' } });
    await screen.findByText('총 41명 · 1 / 1 페이지');
    expect((screen.getByRole('button', { name: '다음 페이지' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '검색 초기화' }));
    await screen.findByText('회원-1');
  });

  it('이전 검색의 늦은 응답을 무시한다', async () => {
    let release!: (result: unknown) => void;
    const previous = new Promise(resolve => { release = resolve; });
    const initial = get.getMockImplementation()!;
    get.mockImplementation((url: string, config: { params?: { q?: string } } = {}) => {
      if (!url.endsWith('/memberships')) return initial(url);
      if (config.params?.q === '이전') return previous;
      return ok({ memberships: [{ ...pendingRows[0], name: config.params?.q || '초기 회원' }] });
    });
    mount(); await screen.findByText('초기 회원');
    for (const q of ['이전', '현재']) { fireEvent.change(screen.getByLabelText('이름 검색'), { target: { value: q } }); fireEvent.click(screen.getByRole('button', { name: '검색', exact: true })); }
    await screen.findByText('현재');
    await act(async () => release({ data: { data: { memberships: [{ ...pendingRows[0], name: '늦은 회원' }] } } }));
    expect(screen.queryByText('늦은 회원')).toBeNull();
  });


  it('마지막 페이지의 승인 후 현재 검색을 유지하며 유효 페이지로 이동한다', async () => {
    let total = 21;
    const initial = get.getMockImplementation()!;
    get.mockImplementation((url: string, config: { params?: { q?: string; page?: number } } = {}) => {
      if (!url.endsWith('/memberships')) return initial(url);
      const page = Math.min(config.params?.page || 1, Math.ceil(total / 20));
      return ok({ memberships: [{ ...pendingRows[0], name: `검색 회원-${page}` }], pagination: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) } });
    });
    post.mockImplementation(() => { total = 20; return ok({}); });
    mount(); await screen.findByText('검색 회원-1');
    fireEvent.change(screen.getByLabelText('이름 검색'), { target: { value: '검색' } });
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/communities/alpha/memberships', { params: { q: '검색', status: 'pending', page: 1, pageSize: 20 } }));
    await screen.findByText('검색 회원-1');
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' })); await screen.findByText('검색 회원-2');
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    await screen.findByText('총 20명 · 1 / 1 페이지');
    expect((screen.getByLabelText('이름 검색') as HTMLInputElement).value).toBe('검색');
    expect(screen.queryByText('검색 회원-2')).toBeNull();
    expect(screen.getByText('검색 회원-2 님의 가입을 승인했습니다.')).toBeTruthy();
  });

  function adminRows(status = 'active') {
    get.mockImplementation((url: string, config?: { params?: { status?: string } }) => {
      if (url.endsWith('/operating')) return ok({ communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 2, canRestrictMembers: true }] });
      if (url.endsWith('/history')) return ok({ changes: [] });
      return ok({ memberships: pendingRows.map(row => ({ ...row, status: config?.params?.status === 'pending' ? status : config?.params?.status })) });
    });
  }
  function inputReason(reason: string) {
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: reason } });
    fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  }
  function deferred() {
    let resolve!: (value: unknown) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  }

  it('반려 사유를 비워도 기존 선택 계약대로 null을 전송한다', async () => {
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '거절' }))[0]);
    inputReason('   ');
    await waitFor(() => expect(post).toHaveBeenCalledWith('/communities/alpha/memberships/m1/reject', { reason: null }));
  });

  it('1000자 초과 입력은 사유를 보존하고 서버로 보내지 않는다', async () => {
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '거절' }))[0]);
    const reason = '사'.repeat(1001);
    inputReason(reason);
    expect(screen.getByText('처리 사유는 1000자 이내로 입력하세요.')).toBeTruthy();
    expect((screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value).toBe(reason);
    expect(post).not.toHaveBeenCalled();
  });

  it('반려 실패는 대상과 사유를 보존하고 동일 입력으로 재시도한다' , async () => {
    post.mockRejectedValueOnce({ response: { data: { error: '반려 저장 실패' } } });
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '거절' }))[0]);
    inputReason('  중복 신청 사유  ');
    expect(await screen.findByText('반려 저장 실패')).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getByText(/처리 대상: 홍길동/)).toBeTruthy();
    expect((screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value).toBe('  중복 신청 사유  ');
    fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
    await screen.findByText(/가입 신청을 반려했습니다/);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['정지', '정지 해제', '커뮤니티 탈퇴'])('%s는 사유 필수이며 빈 입력을 전송하지 않는다', async action => {
    adminRows(action === '정지 해제' ? 'suspended' : 'active');
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: action, exact: true }))[0]);
    inputReason('   ');
    expect(screen.getByText('처리 사유를 입력하세요.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it.each([
    ['정지', 'active', 'suspend'], ['정지 해제', 'suspended', 'restore'], ['커뮤니티 탈퇴', 'suspended', 'withdraw'],
  ])('%s 실패는 사유·대상과 기존 서버 거부 메시지를 보존한다', async (label, status, action) => {
    adminRows(status);
    post.mockRejectedValueOnce({ response: { data: { error: '마지막 유효 admin을 먼저 지정하세요.', code: 'LAST_ADMIN_PROTECTED' } } });
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: label, exact: true }))[0]);
    inputReason('회원 운영 사유');
    expect(await screen.findByText('마지막 유효 admin을 먼저 지정하세요.')).toBeTruthy();
    expect((screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value).toBe('회원 운영 사유');
    expect(post).toHaveBeenCalledWith(`/communities/alpha/memberships/m1/${action}`, { reason: '회원 운영 사유' });
    fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('폼을 연 동안 필터·다른 행을 잠그고 중복 submit을 동기적으로 막는다', async () => {
    const saving = deferred(); post.mockReturnValue(saving.promise);
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '거절' }))[0]);
    expect((screen.getByLabelText('회원 상태') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getAllByRole('button', { name: '승인' })[0] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: '사유' } });
    const form = screen.getByLabelText('처리 사유').closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(post).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: '취소' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => saving.resolve({ data: { data: {} } }));
    await screen.findByText(/가입 신청을 반려했습니다/);
  });

  it('성공 후 목록 실패는 처리 성공을 유지하고 재조회가 mutation을 재전송하지 않는다', async () => {
    mount(); await screen.findByText('홍길동');
    let fail = true;
    const original = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/memberships') && fail
      ? Promise.reject({ response: { data: { error: '갱신 목록 실패' } } }) : original(url, ...args));
    fireEvent.click(screen.getAllByRole('button', { name: '승인' })[0]);
    await screen.findByText(/처리는 완료했지만 최신 목록/);
    expect(screen.getByText('홍길동 님의 가입을 승인했습니다.')).toBeTruthy();
    expect(screen.getByText('갱신 목록 실패')).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '최신 목록 다시 조회' }));
    await screen.findByText('홍길동');
    await waitFor(() => expect(screen.queryByText(/처리는 완료했지만 최신 목록/)).toBeNull());
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByText('홍길동 님의 가입을 승인했습니다.')).toBeTruthy();
  });

  it('처리 후 운영 목록 실패도 저장 실패로 표시하지 않는다', async () => {
    mount(); await screen.findByText('홍길동');
    const original = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/operating')
      ? Promise.reject({ response: { data: { error: '운영 목록 갱신 실패' } } }) : original(url, ...args));
    fireEvent.click(screen.getAllByRole('button', { name: '승인' })[0]);
    await screen.findByText(/처리는 완료했지만 최신 목록/);
    expect(screen.getByText('홍길동 님의 가입을 승인했습니다.')).toBeTruthy();
    expect(screen.getByText('운영 목록 갱신 실패')).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('처리 성공 후 재조회가 진행되는 동안 다른 mutation을 잠근다', async () => {
    mount(); await screen.findByText('홍길동');
    const refreshed = deferred();
    const original = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/operating') ? refreshed.promise : original(url, ...args));
    fireEvent.click(screen.getAllByRole('button', { name: '승인' })[0]);
    await screen.findByText('홍길동 님의 가입을 승인했습니다.');
    await screen.findByText('홍길동');
    expect((screen.getAllByRole('button', { name: '승인' })[0] as HTMLButtonElement).disabled).toBe(true);
    await act(async () => refreshed.resolve({ data: { data: { communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 1 }] } } }));
    await waitFor(() => expect((screen.getAllByRole('button', { name: '승인' })[0] as HTMLButtonElement).disabled).toBe(false));
  });

  it.each(['resolve', 'reject'] as const)('커뮤니티 전환 뒤 이전 mutation의 늦은 %s를 무시한다', async outcome => {
    const saving = deferred(); post.mockReturnValue(saving.promise);
    get.mockImplementation((url: string) => url.endsWith('/operating') ? ok({ communities: [
      { id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 2 }, { id: 'c2', slug: 'beta', name: 'Beta', pendingCount: 0 },
    ] }) : ok({ memberships: [{ ...pendingRows[0], name: url.includes('/beta/') ? '다른 회원' : '이전 회원' }] }));
    mount(); fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
    await screen.findByText('다른 회원');
    const getCount = get.mock.calls.length;
    await act(async () => { if (outcome === 'resolve') saving.resolve({ data: {} }); else saving.reject({ response: { data: { error: '이전 실패' } } }); });
    expect(screen.queryByText(/가입을 승인했습니다/)).toBeNull();
    expect(screen.queryByText('이전 실패')).toBeNull();
    expect(get).toHaveBeenCalledTimes(getCount);
    expect((screen.getByRole('button', { name: '승인' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('사용자 전환 뒤 이전 처리 결과로 새 사용자의 목록을 갱신하지 않는다', async () => {
    const saving = deferred(); post.mockReturnValue(saving.promise);
    const view = mount(); fireEvent.click((await screen.findAllByRole('button', { name: '승인' }))[0]);
    authState.user = { id: 'op2', email: 'other@example.test', name: '다른 운영자', roles: ['user'] };
    view.rerender(<MemoryRouter><MyCommunityOperatorPage /></MemoryRouter>);
    await screen.findByText('홍길동');
    const getCount = get.mock.calls.length;
    await act(async () => saving.resolve({ data: {} }));
    expect(screen.queryByText(/가입을 승인했습니다/)).toBeNull();
    expect(get).toHaveBeenCalledTimes(getCount);
  });

  it('이력은 대상·로딩을 표시하고 실패 시 이력만 다시 조회한다', async () => {
    adminRows();
    const response = deferred();
    const original = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/history') ? response.promise : original(url, ...args));
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '이력' }))[0]);
    expect(screen.getByText('홍길동 님의 변경 이력 (최근 50건)')).toBeTruthy();
    expect(screen.getByText('변경 이력을 불러오는 중입니다…')).toBeTruthy();
    await act(async () => response.reject({ response: { data: { error: '이력 조회 실패' } } }));
    await screen.findByText('이력 조회 실패');
    const listCount = get.mock.calls.filter(([url]) => url.endsWith('/memberships')).length;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/history') ? ok({ changes: [{
      id: 'h1', action: 'suspend', before_role: 'member', after_role: 'member', before_status: 'active', after_status: 'suspended',
      reason: '검증용 사유', created_at: '2026-10-15T00:00:00Z', actor_name: null,
    }] }) : original(url, ...args));
    fireEvent.click(screen.getByRole('button', { name: '이력 다시 조회' }));
    await screen.findByText('검증용 사유');
    expect(screen.getByText(/시스템 · 정지/)).toBeTruthy();
    expect(screen.getByText('상태: 이용 중 → 이용 정지')).toBeTruthy();
    expect(get.mock.calls.filter(([url]) => url.endsWith('/memberships'))).toHaveLength(listCount);
    expect(post).not.toHaveBeenCalled();
  });

  it('다른 대상의 이력을 열면 이전 대상의 늦은 응답을 무시한다', async () => {
    adminRows();
    const old = deferred();
    const original = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/m1/history') ? old.promise : original(url, ...args));
    mount(); const buttons = await screen.findAllByRole('button', { name: '이력' });
    fireEvent.click(buttons[0]); fireEvent.click(buttons[1]);
    await screen.findByText('변경 이력이 없습니다.');
    expect(screen.getByText('정지회원 님의 변경 이력 (최근 50건)')).toBeTruthy();
    await act(async () => old.resolve({ data: { data: { changes: [{ id: 'h1', reason: '이전 대상 이력', created_at: '2026-10-15T00:00:00Z' }] } } }));
    expect(screen.queryByText('이전 대상 이력')).toBeNull();
  });

  it('이력 닫기 뒤 늦은 응답은 이력 창을 다시 열지 않는다', async () => {
    adminRows(); const old = deferred();
    const original = get.getMockImplementation()!;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/history') ? old.promise : original(url, ...args));
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '이력' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: '이력 닫기' }));
    await act(async () => old.resolve({ data: { data: { changes: [] } } }));
    expect(screen.queryByText('변경 이력이 없습니다.')).toBeNull();
    expect(screen.queryByLabelText('회원 변경 이력')).toBeNull();
  });

  it('운영 권한 재조회에서 제재 권한이 회수되면 작성 중 제재를 닫는다', async () => {
    let approved = false;
    let failOperating = false;
    let canRestrictMembers = true;
    get.mockImplementation((url: string, config?: { params?: { status?: string } }) => {
      if (url.endsWith('/operating')) {
        if (failOperating) return Promise.reject({ response: { data: { error: '운영 목록 갱신 실패' } } });
        return ok({ communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 1, canRestrictMembers }] });
      }
      return ok({ memberships: approved ? (config?.params?.status === 'active' ? [{ ...pendingRows[0], status: 'active' }] : []) : [pendingRows[0]] });
    });
    post.mockImplementation(() => { approved = true; failOperating = true; return ok({}); });
    mount(); fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    await screen.findByText('운영 목록 갱신 실패');
    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'active' } });
    fireEvent.click(await screen.findByRole('button', { name: '정지', exact: true }));
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: '작성 중인 사유' } });
    failOperating = false; canRestrictMembers = false;
    fireEvent.click(screen.getByRole('button', { name: '다시 조회', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: '정지', exact: true })).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('제재 권한이 회수되면 같은 커뮤니티의 진행 중 이력도 버린다', async () => {
    adminRows(); const old = deferred();
    const original = get.getMockImplementation()!;
    let admin = true;
    get.mockImplementation((url: string, ...args: unknown[]) => url.endsWith('/history') ? old.promise : url.endsWith('/operating')
      ? ok({ communities: [{ id: 'c1', slug: 'alpha', name: 'Alpha', pendingCount: 2, canRestrictMembers: admin }] }) : original(url, ...args));
    mount(); fireEvent.click((await screen.findAllByRole('button', { name: '이력' }))[0]);
    // 가입 승인은 권한 재조회도 수행한다.
    fireEvent.change(screen.getByLabelText('회원 상태'), { target: { value: 'pending' } });
    const originalAfter = get.getMockImplementation()!;
    get.mockImplementation((url: string, config?: { params?: { status?: string } }) => url.endsWith('/memberships')
      ? ok({ memberships: [{ ...pendingRows[0], status: 'pending' }] }) : originalAfter(url, config));
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    admin = false;
    await act(async () => old.resolve({ data: { data: { changes: [{ id: 'h1', reason: '회수 전 이력', created_at: '2026-10-15T00:00:00Z' }] } } }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '이력' })).toBeNull());
    expect(screen.queryByText('회수 전 이력')).toBeNull();
  });

});

describe('canApproveJoin', () => {
  it('pending 이고 최초 가입 또는 활성 서비스 회원일 때만', () => {
    expect(canApproveJoin({ status: 'pending', serviceMembershipStatus: 'active' })).toBe(true);
    expect(canApproveJoin({ status: 'pending', serviceMembershipStatus: null })).toBe(true);
    expect(canApproveJoin({ status: 'pending', serviceMembershipStatus: 'suspended' })).toBe(false);
    expect(canApproveJoin({ status: 'active', serviceMembershipStatus: 'active' })).toBe(false);
  });
});

// 최초 가입과 기존 서비스 회원 재활성화는 구분한다.
it.each(['withdrawn', 'rejected', 'pending', 'suspended'])('서비스 %s 신청자는 승인할 수 없다', (status) => {
  expect(canApproveJoin({ status: 'pending', serviceMembershipStatus: status })).toBe(false);

});
