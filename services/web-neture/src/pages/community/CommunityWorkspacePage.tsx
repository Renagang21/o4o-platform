import { requestServiceHandoff } from '@o4o/auth-react';
import CommunityBoardReview from './CommunityBoardReview';
import CommunitySelfWithdrawal from './CommunitySelfWithdrawal';
import MyPostsPage from '../forum/MyPostsPage';
import ForumRequestPage from '../forum/ForumRequestPage';
import MyForumDashboardPage from '../supplier/MyForumDashboardPage';
import CommunityForumMembersPage from './CommunityForumMembersPage';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { api } from '../../lib/apiClient';
import ForumHubPage from '../forum/ForumHubPage';
import { ForumPage } from '../forum/ForumPage';
import { ForumWritePage } from '../forum/ForumWritePage';
import { ForumPostPage } from '../forum/ForumPostPage';

export interface CommunityWorkspace {
  communityKey: string;
  businessKey?: string;
  name: string;
  kind: 'independent' | 'semi-franchise';
  allowed: boolean;
  canManage: boolean;
  canJoin: boolean;
  membershipStatus: string | null;
  communityStatus?: string | null;
  reason: string | null;
}

export default function CommunityWorkspacePage({ view = 'hub' }: { view?: 'hub' | 'posts' | 'write' | 'post' | 'mine' | 'request' | 'owned' | 'members' }) {
  const { communityKey = '' } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moveRetry, setMoveRetry] = useState(0);
  const [workspace, setWorkspace] = useState<CommunityWorkspace | null>(null);
  const [error, setError] = useState('');
  const [boardName, setBoardName] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const basePath = `/communities/${encodeURIComponent(communityKey)}/forum`;
  useEffect(() => { setNotice(''); }, [communityKey, user?.id]);
  useEffect(() => {
    let active = true;
    setWorkspace(null); setError('');
    api.get(`/communities/${encodeURIComponent(communityKey)}/access`).then((r: { data: { data: CommunityWorkspace } }) => {
      if (active) setWorkspace(r.data.data);
    }).catch(() => { if (active) setError('커뮤니티 정보를 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [communityKey, user?.id, version]);

  useEffect(() => {
    if (workspace?.kind !== 'semi-franchise' || workspace.communityKey !== communityKey || !workspace.businessKey) return;
    let alive = true;
    setError('');
    const suffix = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
    const returnPath = `/businesses/${encodeURIComponent(workspace.businessKey)}/forum${suffix}${location.search}${location.hash}`;
    if (!isAuthenticated) {
      window.location.assign(`https://pharmacy.neture.co.kr${returnPath}`);
    } else {
      requestServiceHandoff(api, { serviceKey: 'kpa-society', origin: 'https://pharmacy.neture.co.kr', returnPath })
        .then(href => { if (alive) window.location.assign(href); })
        .catch(() => { if (alive) setError('사업 참여자 공간으로 이동하지 못했습니다.'); });
    }
    return () => { alive = false; };
  }, [workspace, communityKey, isAuthenticated, basePath, location.pathname, location.search, location.hash, moveRetry]);
  if (workspace?.kind === 'semi-franchise') return <section className="mx-auto max-w-6xl p-6">
    {error ? <><p role="alert">{error}</p><button type="button" onClick={() => setMoveRetry(n => n + 1)}>다시 이동</button></> : <output aria-live="polite">사업 서비스의 참여자 공간으로 이동합니다…</output>}
    {!workspace.businessKey && <><p>사업 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.</p><button type="button" onClick={() => setVersion(n => n + 1)}>사업 정보 다시 확인</button></>}
  </section>;

  const join = async () => {
    setBusy(true); setError('');
    try { await api.post(`/communities/${encodeURIComponent(communityKey)}/join`, {}); setVersion(v => v + 1); }
    catch (e: any) { setError(e.response?.data?.error || '가입 신청에 실패했습니다. 내 프로필의 닉네임과 이용 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const createBoard = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.post(`/communities/${encodeURIComponent(communityKey)}/boards`, { name: boardName });
      setBoardName(''); navigate(`${basePath}/posts?category=${r.data.data.id}`);
    } catch { setError('게시판을 만들지 못했습니다.'); }
    finally { setBusy(false); }
  };
  return <div className="max-w-6xl mx-auto px-4 py-8">
    <Link to="/" className="text-sm text-blue-700">커뮤니티 목록</Link>
    {notice && <p role="status" className="my-4 text-green-700">{notice}</p>}
    {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
    {!workspace && !error && <p className="my-4">불러오는 중입니다…</p>}
    {workspace && !workspace.allowed && <section className="my-6 rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>
      <p className="my-4">{workspace.membershipStatus === 'pending' ? '가입 신청을 접수했습니다. 운영자의 승인을 기다려 주세요.' : '이 커뮤니티는 가입 승인 후 참여할 수 있습니다.'}</p>
      {!isAuthenticated && <Link to={`/login?returnUrl=${encodeURIComponent(basePath)}`}>로그인</Link>}
      {workspace.canJoin && <button type="button" disabled={busy} onClick={join} className="rounded bg-blue-700 px-4 py-2 text-white">가입 신청</button>}
      {workspace.reason === 'NETURE_MEMBERSHIP_REQUIRED' && <Link to="/mypage">내 계정 확인</Link>}
    </section>}
    {workspace?.allowed && <>
      <nav className="my-4 flex gap-4 text-sm text-blue-700"><Link to={basePath}>게시판</Link><Link to={`${basePath}/my-posts`}>내 글</Link><Link to={`${basePath}/owned`}>내 게시판 · 신청</Link></nav>
      {workspace.canManage && <section className="my-4 flex flex-wrap items-center gap-3 rounded border bg-white p-4">
        <label>게시판 이름 <input value={boardName} maxLength={100} onChange={e => setBoardName(e.target.value)} className="ml-2 rounded border px-3 py-2" /></label>
        <button type="button" disabled={busy || !boardName.trim()} onClick={createBoard} className="rounded bg-blue-700 px-4 py-2 text-white">게시판 만들기</button>
        {workspace.kind === 'independent' && <Link to="/mypage/communities">회원 가입 심사</Link>}
      </section>}
      {workspace.canManage && <CommunityBoardReview communityKey={communityKey} />}
      {view === 'hub' && <ForumHubPage title={workspace.name} basePath={basePath} requestAction={<Link to={`${basePath}/request`}>게시판 개설 신청</Link>} description="회원들과 소식과 자료를 나누는 공간입니다." />}
      {view === 'posts' && <ForumPage title={workspace.name} boardSlug={new URLSearchParams(window.location.search).get('board') || undefined} basePath={basePath} />}
      {view === 'write' && <ForumWritePage communityLabel={workspace.name} categorySlug="" backPath={basePath} />}
      {view === 'post' && <ForumPostPage basePath={basePath} canModerate={workspace.canManage} />}
      {view === 'mine' && <MyPostsPage basePath={basePath} />}
      {view === 'request' && <ForumRequestPage basePath={basePath} />}
      {view === 'owned' && <MyForumDashboardPage basePath={basePath} />}
      {view === 'members' && <CommunityForumMembersPage basePath={basePath} />}
    </>}
    {isAuthenticated && workspace?.kind === 'independent' && workspace.communityStatus === 'active' && workspace.membershipStatus === 'active' &&
      <CommunitySelfWithdrawal key={communityKey} communityKey={communityKey} name={workspace.name} onWithdrawn={() => {
        setNotice('이 커뮤니티의 개별 가입을 탈퇴했습니다.');
        setWorkspace(null); setVersion(v => v + 1);
      }} />}
  </div>;
}
