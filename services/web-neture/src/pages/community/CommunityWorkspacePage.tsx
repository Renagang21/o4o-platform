import { cooperationDestination } from '@o4o/shared-space-ui';
import { CURRENT_HOST_PROFILE } from '../../lib/hostProfile';
import { ServiceEnrollmentPolicyAgreement, useServiceEnrollmentPolicies } from '@o4o/shared-space-ui';
import { requestServiceHandoff } from '@o4o/auth-react';
import CommunityBoardReview from './CommunityBoardReview';
import CommunityPublicReadManager from './CommunityPublicReadManager';
import CarePharmCommunityGuide from '../carepharm/CarePharmCommunityGuide';
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

function membershipMessage(status: string | null): string {
  const messages: Record<string, string> = {
    pending: '가입 신청을 접수했습니다. 운영자의 승인을 기다려 주세요.',
    suspended: '커뮤니티 서비스 이용이 정지되었습니다. 운영자에게 문의해 주세요.',
    withdrawn: '커뮤니티 서비스에서 탈퇴한 상태입니다. 운영자에게 문의해 주세요.',
  };
  return messages[status ?? ''] ?? '커뮤니티 서비스에 가입 신청하고 운영자 승인 후 참여할 수 있습니다.';
}

type WorkspaceView = 'hub' | 'posts' | 'write' | 'post' | 'mine' | 'request' | 'owned' | 'members';
export default function CommunityWorkspacePage({ view = 'hub' }: { view?: WorkspaceView }) {
  const { communityKey = 'community' } = useParams();
  const { user } = useAuth();
  return <Workspace key={`${user?.id ?? 'anonymous'}:${communityKey}`} view={view} />;
}
function Workspace({ view }: { view: WorkspaceView }) {
  const { communityKey = 'community' } = useParams();
  const nativeBusiness = CURRENT_HOST_PROFILE === 'carepharm' && communityKey === 'business:carepharm';
  const { user, isAuthenticated } = useAuth();
  const agreement = useServiceEnrollmentPolicies('community', async () => nativeBusiness ? [] : (await api.get('/public/services/community/enrollment-policies')).data.data, `${user?.id ?? 'signed-out'}:${communityKey}`);
  const navigate = useNavigate();
  const location = useLocation();
  const [moveRetry, setMoveRetry] = useState(0);
  const [workspace, setWorkspace] = useState<CommunityWorkspace | null>(null);
  const [error, setError] = useState('');
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const basePath = `/communities/${encodeURIComponent(communityKey)}/forum`;
  const nativeAccess = nativeBusiness && workspace?.kind === 'semi-franchise' && workspace.businessKey === 'carepharm';
  useEffect(() => {
    let active = true;
    setWorkspace(null); setError('');
    api.get(`/communities/${encodeURIComponent(communityKey)}/access`).then((r: { data: { data: CommunityWorkspace } }) => {
      if (active) setWorkspace(r.data.data);
    }).catch(() => { if (active) setError('커뮤니티 정보를 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [communityKey, user?.id, version]);

  useEffect(() => {
    if (nativeAccess || workspace?.kind !== 'semi-franchise' || workspace.communityKey !== communityKey || !workspace.businessKey) return;
    let alive = true;
    setError('');
    const suffix = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
    const destination = cooperationDestination(workspace.businessKey, 'community');
    const returnPath = `${destination.returnPath}${suffix}${location.search}${location.hash}`;
    if (!isAuthenticated) {
      window.location.assign(`${destination.origin}${returnPath}`);
    } else {
      requestServiceHandoff(api, { ...destination, returnPath })
        .then(href => { if (alive) window.location.assign(href); })
        .catch(() => { if (alive) setError('사업 참여자 공간으로 이동하지 못했습니다.'); });
    }
    return () => { alive = false; };
  }, [workspace, communityKey, isAuthenticated, basePath, location.pathname, location.search, location.hash, moveRetry, nativeAccess]);
  if (workspace?.kind === 'semi-franchise' && !nativeAccess) return <section className="mx-auto max-w-6xl p-6">
    {error ? <><p role="alert">{error}</p><button type="button" onClick={() => setMoveRetry(n => n + 1)}>다시 이동</button></> : <output aria-live="polite">사업 서비스의 참여자 공간으로 이동합니다…</output>}
    {!workspace.businessKey && <><p>사업 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.</p><button type="button" onClick={() => setVersion(n => n + 1)}>사업 정보 다시 확인</button></>}
  </section>;

  const join = async () => {
    if (nativeBusiness || communityKey !== 'community' || workspace?.kind !== 'independent') return;
    if (!agreement.ready || busy) return;
    setBusy(true); setError('');
    try { await api.post('/communities/join', { policyReferences: agreement.references }); setVersion(v => v + 1); }
    catch (e: any) { if (['POLICY_VERSION_MISMATCH', 'ENROLLMENT_POLICY_REQUIRED'].includes(e.response?.data?.code)) agreement.reload(); setError(e.response?.data?.error || '가입 신청에 실패했습니다. 내 프로필의 닉네임과 이용 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const createBoard = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.post(`/communities/${encodeURIComponent(communityKey)}/boards`, { name: boardName, ...(nativeAccess ? { description: boardDescription } : {}) });
      setBoardName(''); setBoardDescription(''); navigate(`${basePath}/posts?category=${r.data.data.id}`);
    } catch { setError('게시판을 만들지 못했습니다.'); }
    finally { setBusy(false); }
  };
  return <div className="max-w-6xl mx-auto px-4 py-8">
    <Link to="/" className="text-sm text-blue-700">커뮤니티 홈</Link>
    {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
    {!workspace && !error && <p className="my-4">불러오는 중입니다…</p>}
    {nativeBusiness && workspace && !nativeAccess && <p role="alert">이 서비스의 사업 회원 공간을 확인하지 못했습니다.</p>}
    {workspace && (!nativeBusiness || nativeAccess) && !workspace.allowed && <section className="my-6 rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>
      {!nativeBusiness && <Link to={`/communities/${encodeURIComponent(communityKey)}/public`} className="mt-3 inline-block text-sm text-blue-700">공개 게시글 보기 →</Link>}
      <p className="my-4">{membershipMessage(workspace.membershipStatus)}</p>
      {!isAuthenticated && <Link to={`/login?returnUrl=${encodeURIComponent(basePath)}`}>로그인</Link>}
      {!nativeBusiness && workspace.canJoin && <ServiceEnrollmentPolicyAgreement agreement={agreement} />}
      {!nativeBusiness && workspace.canJoin && <button type="button" disabled={busy || !agreement.ready} onClick={join} className="rounded bg-blue-700 px-4 py-2 text-white">가입 신청</button>}
      {workspace.reason === 'ACCOUNT_NOT_ACTIVE' && <Link to="/mypage">내 계정 확인</Link>}
    </section>}
    {nativeBusiness && nativeAccess && !workspace?.allowed && <Link to="/my/participation">서비스 참여 신청 · 상태 확인</Link>}
    {workspace?.allowed && (!nativeBusiness || nativeAccess) && <>
      <nav className="my-4 flex gap-4 text-sm text-blue-700"><Link to={basePath}>게시판</Link><Link to={`${basePath}/my-posts`}>내 글</Link><Link to={`${basePath}/owned`}>내 게시판 · 신청</Link></nav>
      {nativeAccess && <CarePharmCommunityGuide onSelect={workspace.canManage ? item => { setBoardName(item.name); setBoardDescription(item.description); } : undefined} />}
      {workspace.canManage && <section className="my-4 flex flex-wrap items-center gap-3 rounded border bg-white p-4">
        <label>게시판 이름 <input value={boardName} maxLength={100} onChange={e => setBoardName(e.target.value)} className="ml-2 rounded border px-3 py-2" /></label>
        {nativeAccess && <label className="w-full">게시판 설명 <textarea value={boardDescription} maxLength={4000} rows={3} onChange={e => setBoardDescription(e.target.value)} className="mt-2 block w-full rounded border px-3 py-2" /></label>}
        <button type="button" disabled={busy || !boardName.trim()} onClick={createBoard} className="rounded bg-blue-700 px-4 py-2 text-white">게시판 만들기</button>
        {workspace.kind === 'independent' && <Link to="/operator/service-members/community">서비스 회원 관리</Link>}
      </section>}
      {workspace.canManage && <CommunityBoardReview communityKey={communityKey} />}
      {workspace.canManage && workspace.kind === 'independent' && <CommunityPublicReadManager key={communityKey} communityKey={communityKey} />}
      {view === 'hub' && <ForumHubPage title={workspace.name} basePath={basePath} requestAction={<Link to={`${basePath}/request`}>게시판 개설 신청</Link>} description="회원들과 소식과 자료를 나누는 공간입니다." />}
      {view === 'posts' && <ForumPage title={workspace.name} description={nativeAccess ? '협업체 회원이 약국 운영 경험과 자료 활용 정보를 나누는 공간입니다.' : undefined} boardSlug={new URLSearchParams(window.location.search).get('board') || undefined} basePath={basePath} />}
      {view === 'write' && <ForumWritePage communityLabel={workspace.name} categorySlug="" backPath={basePath} writingContext={nativeAccess ? 'carepharm' : undefined} />}
      {view === 'post' && <ForumPostPage basePath={basePath} canModerate={workspace.canManage} />}
      {view === 'mine' && <MyPostsPage basePath={basePath} />}
      {view === 'request' && <ForumRequestPage basePath={basePath} />}
      {view === 'owned' && <MyForumDashboardPage basePath={basePath} />}
      {view === 'members' && <CommunityForumMembersPage basePath={basePath} />}
    </>}

  </div>;
}
