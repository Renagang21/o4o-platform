import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { ForumOwnerMemberManagement, createForumOwnerMembershipApi } from '@o4o/shared-space-ui';
import { getFundingForumAccess, type FundingForumAccess } from '../../api/trial';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { ForumPage } from '../forum/ForumPage';
import { ForumPostPage } from '../forum/ForumPostPage';
import { ForumWritePage } from '../forum/ForumWritePage';
import { NETURE_FORUM_OWNER_THEME } from '../../services/forumOwnerAdapter';

const responseData = (response: { data: unknown }) => response.data;

type Context = { access: FundingForumAccess; basePath: string; trialId: string };
export function FundingForumLayout() {
  const { id = '' } = useParams();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [loadedScope, setLoadedScope] = useState('');
  const [access, setAccess] = useState<FundingForumAccess | null>(null);
  const [error, setError] = useState(''), [version, setVersion] = useState(0), [busy, setBusy] = useState(false), [requested, setRequested] = useState(false);
  const scope = `${id}:${user?.id}:${version}`;
  const beginWrite = useLatestRequest(scope);
  useEffect(() => {
    let active = true; setAccess(null); setError(''); setRequested(false); setBusy(false);
    if (!isAuthenticated) return;
    getFundingForumAccess(id).then(value => { if (active) { setAccess(value); setLoadedScope(scope); } }).catch(e => {
      if (active) setError(e.response?.data?.message || '포럼 이용 상태를 확인하지 못했습니다.');
    });
    return () => { active = false; };
  }, [id, user?.id, isAuthenticated, version, scope]);
  if (authLoading) return <p role="status" className="p-6">로그인 상태 확인 중…</p>;
  if (!isAuthenticated) return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  const requestJoin = async () => {
    if (loadedScope !== scope || !access?.forum || busy) return;
    const current = beginWrite();
    setBusy(true); setError('');
    try { await api.post(`/funding/${id}/forum/categories/${access.forum.id}/join-requests`); if (current()) setRequested(true); }
    catch (e: any) {
      if (!current()) return;
      if (e.response?.data?.code === 'PENDING_REQUEST') setRequested(true);
      else setError(e.response?.data?.error || '신청하지 못했습니다. 다시 시도해 주세요.');
    } finally { if (current()) setBusy(false); }
  };
  const currentAccess = loadedScope === scope ? access : null;
  const basePath = `/market-trial/${id}/forum`;
  return <section className="mx-auto max-w-6xl p-4 sm:p-6">
    <nav className="mb-4 flex flex-wrap gap-4 text-blue-700"><Link to={`/market-trial/${id}`}>펀딩 소개</Link><Link to="/market-trial/manage">내 펀딩</Link>{currentAccess?.canRead && <Link to={basePath}>포럼 목록</Link>}{currentAccess?.canWrite && <Link to={`${basePath}/write`}>글 작성</Link>}{currentAccess?.canManage && <Link to={`${basePath}/members`}>포럼 회원 관리</Link>}</nav>
    {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
    {!currentAccess ? <button className="min-h-11 rounded border px-4" onClick={() => setVersion(v => v + 1)}>{error ? '다시 확인' : '포럼 이용 상태 확인 중…'}</button>
      : !currentAccess.forum ? <p>전용 포럼 개설을 기다리고 있습니다.</p>
      : !currentAccess.canRead ? <div className="rounded border p-4"><p>포럼 이용은 개설자 승인 후 가능합니다. 입금 확인과 별도로 관리됩니다.</p><button disabled={busy || requested} className="mt-3 min-h-11 rounded border px-4 disabled:opacity-50" onClick={requestJoin}>{requested ? '승인 대기 중' : '포럼 이용 신청'}</button><button className="ml-3 min-h-11 px-4" onClick={() => setVersion(v => v + 1)}>승인 상태 확인</button></div>
      : <Outlet key={scope} context={{ access: currentAccess, basePath, trialId: id } satisfies Context} />}
  </section>;
}
export function FundingForumList() {
  const { basePath, trialId } = useOutletContext<Context>();
  return <ForumPage title="펀딩 참여자 포럼" boardSlug={`funding-${trialId}`} basePath={basePath} />;
}
export function FundingForumPost() {
  const { basePath, access, trialId } = useOutletContext<Context>();
  return <ForumPostPage basePath={basePath} canModerate={access.canModerate && access.canWrite} readOnly={!access.canWrite} pinPost={(postId, pin) => api.patch(`/funding/${trialId}/forum/posts/${postId}/pin`, { pin }).then(() => {})} />;
}
export function FundingForumWrite() {
  const { basePath, trialId, access } = useOutletContext<Context>();
  return access.canWrite ? <ForumWritePage communityLabel="펀딩 참여자 포럼" categorySlug={`funding-${trialId}`} backPath={basePath} allowAnnouncement={access.canModerate} /> : <p>종료된 펀딩은 읽기 전용입니다.</p>;
}
export function FundingForumMembers() {
  const { trialId, access, basePath } = useOutletContext<Context>();
  const adapter = useMemo(() => {
    const categories = `/funding/${trialId}/forum/categories`;
    return createForumOwnerMembershipApi({
      fetchOwnedForums: () => api.get(`${categories}/mine`).then(responseData),
      fetchJoinRequests: id => api.get(`${categories}/${id}/join-requests`).then(responseData),
      fetchMembers: id => api.get(`${categories}/${id}/members`).then(responseData),
      approveJoin: (id, requestId) => api.post(`${categories}/${id}/join-requests/${requestId}/approve`).then(responseData),
      rejectJoin: (id, requestId, comment) => api.post(`${categories}/${id}/join-requests/${requestId}/reject`, { reviewComment: comment }).then(responseData),
      removeMember: (id, userId) => api.delete(`${categories}/${id}/members/${userId}`).then(responseData),
    });
  }, [trialId]);
  if (!access.canManage || !access.canWrite) return <p>이 펀딩의 개설자만 진행 중 포럼 회원을 관리할 수 있습니다.</p>;
  return <ForumOwnerMemberManagement forumId={access.forum!.id} api={adapter} theme={NETURE_FORUM_OWNER_THEME} backHref={basePath} />;
}
