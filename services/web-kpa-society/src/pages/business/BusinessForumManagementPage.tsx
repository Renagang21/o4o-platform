import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ForumRequestForm, ForumOwnerDashboard, ForumOwnerMemberManagement, createCommunityForumOwnerAdapters } from '@o4o/shared-space-ui';
import { authClient } from '../../contexts/AuthContext';
import { useBusiness } from './BusinessWorkspace';
import { businessApi, businessPath, businessError, communityApiBase } from './api';

export default function BusinessForumManagementPage({ view }: Readonly<{ view: 'request' | 'owned' | 'members' | 'manage' }>) {
  const { business, access } = useBusiness();
  const { forumId } = useParams();
  const navigate = useNavigate();
  const apiBase = communityApiBase(business.communityKey!);
  const base = businessPath(business.key, 'forum');
  const adapters = useMemo(() => createCommunityForumOwnerAdapters(authClient.api, business.communityKey!), [business.communityKey]);
  if (view === 'request') return <ForumRequestForm title="참여자 게시판 개설 신청" backTo={base} theme="blue"
    onSubmit={async payload => {
      try { await businessApi.post(`${apiBase}/board-requests`, payload); return { success: true }; }
      catch (e) { return { success: false, error: businessError(e) }; }
    }} onSuccess={() => navigate(`${base}/owned`)} />;
  if (view === 'members') return <ForumOwnerMemberManagement forumId={forumId} api={adapters.members} backHref={`${base}/owned`} />;
  if (view === 'manage') return access?.canManage ? <BusinessBoardReview apiBase={apiBase} /> : <p>담당 사업 운영자만 게시판을 관리할 수 있습니다.</p>;
  return <ForumOwnerDashboard api={adapters.owner} links={{ forumHomeHref: base, requestFormHref: `${base}/request`,
    forumHref: slug => `${base}/posts?board=${encodeURIComponent(slug)}`, memberManageHref: id => `${base}/owned/${id}/members` }} />;
}

function BusinessBoardReview({ apiBase }: Readonly<{ apiBase: string }>) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; requesterName: string }>>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setRows([]); setError(''); setLoading(true);
    businessApi.get<typeof rows>(`${apiBase}/board-requests`, { review: true })
      .then(items => { if (alive) setRows(items); }).catch(e => { if (alive) setError(businessError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apiBase, version]);
  const act = async (callback: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await callback(); setVersion(n => n + 1); }
    catch (e) { setError(businessError(e)); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border bg-white p-6">
    <h2 className="text-lg font-semibold">게시판 운영</h2>
    {error && <p role="alert">{error}</p>}
    <form className="my-4 flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); void act(async () => { await businessApi.post(`${apiBase}/boards`, { name }); setName(''); }); }}>
      <label>새 게시판 이름 <input value={name} maxLength={100} onChange={e => setName(e.target.value)} className="ml-2 rounded border p-2" /></label>
      <button type="submit" disabled={busy || !name.trim()} className="text-blue-700">게시판 만들기</button>
    </form>
    <h3 className="font-semibold">개설 신청 심사</h3>
    {loading && <output aria-live="polite">신청 목록을 확인하고 있습니다…</output>}
    {rows.map(row => <div key={row.id} className="my-4 flex flex-wrap gap-4">
      <span>{row.name} · {row.requesterName}</span>
      {(['approve', 'reject'] as const).map(action => <button type="button" key={action} disabled={busy} onClick={() => void act(() => authClient.api.patch(`${apiBase}/board-requests/${row.id}`, { action }))}>{action === 'approve' ? '승인' : '반려'}</button>)}
    </div>)}
    {!loading && !rows.length && !error && <p className="mt-3">대기 중인 신청이 없습니다.</p>}
  </section>;
}
