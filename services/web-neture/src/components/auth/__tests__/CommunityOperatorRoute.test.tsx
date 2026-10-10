import { createContext, useCallback, useContext, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth, type User } from '../../../contexts/AuthContext';
import { SubdomainOperatorRoute } from '../RoleGuard';

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
type Auth = ReturnType<typeof useAuth>;
const Context = createContext<Auth | null>(null);
const viewer = (roles: string[], status = 'active'): User => ({
  id: 'fixture-user', email: 'fixture@example.invalid', name: 'Fixture', roles,
  memberships: [{ serviceKey: 'community', status }],
});
let serverUser: User;
const requests = vi.fn();
function Harness({ initial, level = 'admin' }: { initial: User; level?: 'admin' | 'operator' }) {
  const [user, setUser] = useState(initial);
  const refreshAuth = useCallback(async () => { await requests(); setUser(serverUser); }, []);
  const auth = { user, isAuthenticated: true, isLoading: false, refreshAuth } as Auth;
  return <Context.Provider value={auth}><MemoryRouter initialEntries={['/admin/communities']}>
    <SubdomainOperatorRoute serviceKey="community" level={level}><p>관리 목록</p></SubdomainOperatorRoute>
  </MemoryRouter></Context.Provider>;
}
beforeEach(() => {
  vi.mocked(useAuth).mockImplementation(() => useContext(Context)!);
  requests.mockReset();
});
afterEach(cleanup);

describe('community 관리 진입 시 최신 역할 확인', () => {
  it('현재 화면에는 역할이 없어도 서버에서 Admin이 부여됐으면 조회 화면을 연다', async () => {
    serverUser = viewer(['community:admin']);
    render(<Harness initial={viewer([])} />);
    await screen.findByText('관리 목록');
    expect(requests).toHaveBeenCalledOnce();
  });
  it('현재 화면에 Admin이 남아 있어도 서버에서 해제됐으면 거부한다', async () => {
    serverUser = viewer([]);
    render(<Harness initial={viewer(['community:admin'])} />);
    await screen.findByText('접근 권한이 없습니다');
    expect(screen.getByText('로그인 계정: fixture@example.invalid')).toBeTruthy();
    expect(screen.queryByText('관리 목록')).toBeNull();
  });
  it('Operator만으로는 Admin 관리 화면을 열 수 없다', async () => {
    serverUser = viewer(['community:operator']);
    render(<Harness initial={serverUser} />);
    await screen.findByRole('button', { name: '권한 다시 확인' });
    expect(screen.queryByText('관리 목록')).toBeNull();
  });
  it('Operator는 Operator 관리 화면을 연다', async () => {
    serverUser = viewer(['community:operator']);
    render(<Harness initial={serverUser} level="operator" />);
    await screen.findByText('관리 목록');
  });
  it.each(['pending', 'suspended'])('역할이 있어도 서비스 가입 상태 %s는 관리 화면을 차단한다', async (status) => {
    serverUser = viewer(['community:admin'], status);
    render(<Harness initial={serverUser} />);
    await waitFor(() => expect(requests).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByText('관리 목록')).toBeNull();
  });
  it('거부 후 역할 지정이 완료되면 다시 확인 버튼으로 복구한다', async () => {
    serverUser = viewer([]);
    render(<Harness initial={serverUser} />);
    await screen.findByRole('button', { name: '권한 다시 확인' });
    serverUser = viewer(['community:admin']);
    fireEvent.click(screen.getByRole('button', { name: '권한 다시 확인' }));
    await screen.findByText('관리 목록');
    expect(requests).toHaveBeenCalledTimes(2);
  });
});


describe('community recheck failure recovery', () => {
  it('initial network failure does not open the page using stale Admin roles', async () => {
    serverUser = viewer(['community:admin']);
    requests.mockRejectedValueOnce(new Error('temporary failure'));
    render(<Harness initial={serverUser} />);
    await screen.findByText('권한을 확인하지 못했습니다');
    expect(screen.queryByText('관리 목록')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '권한 다시 확인' }));
    await screen.findByText('관리 목록');
  });
  it('button recheck failure shows retry guidance rather than a success notice', async () => {
    serverUser = viewer([]);
    render(<Harness initial={serverUser} />);
    await screen.findByRole('button', { name: '권한 다시 확인' });
    requests.mockRejectedValueOnce(new Error('temporary failure'));
    fireEvent.click(screen.getByRole('button', { name: '권한 다시 확인' }));
    await screen.findByText('권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(screen.queryByText('관리 목록')).toBeNull();
  });
});
