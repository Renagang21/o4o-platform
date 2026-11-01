import { useSearchParams } from 'react-router-dom';
import { ImprovementForum } from '@o4o/operator-core-ui';
import { useAuth } from '@o4o/auth-context';
import { useEffect, useRef, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { CommunityBoardReview, CommunityPublicReadManager } from '@o4o/operator-core-ui/modules/community-forums';
const client = authClient.api;
export default function CentralCommunityForums() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const state = useRef({ mounted: false, writing: false });
  useEffect(() => { const current = state.current; current.mounted = true; return () => { current.mounted = false; }; }, []);
  async function create() {
    const current = state.current;
    if (!name.trim() || !current.mounted || current.writing) return;
    current.writing = true; setBusy(true); setError(''); setNotice('');
    try {
      await client.post('/communities/community/boards', { name: name.trim() });
      if (current.mounted) { setName(''); setVersion(value => value + 1); setNotice('게시판을 만들었습니다. 공개 범위를 확인해 주세요.'); }
    } catch { if (current.mounted) setError('게시판을 만들지 못했습니다. 현재 권한과 입력 내용을 확인해 주세요.'); }
    finally { current.writing = false; if (current.mounted) setBusy(false); }
  }
  const { user } = useAuth();
  const [search, setSearch] = useSearchParams();
  const showImprovements = search.get('tab') === 'improvements' || search.has('improvement');
  return <section className="space-y-6"><h1 className="text-xl font-bold">커뮤니티 게시판 개설·공개 설정</h1>
    <nav aria-label="커뮤니티 포럼 업무" className="flex flex-wrap gap-3">
      <button type="button" aria-pressed={!showImprovements} className="rounded border bg-white px-3 py-2" onClick={() => setSearch(new URLSearchParams())}>포럼 개설 신청·관리</button>
      <button type="button" aria-pressed={showImprovements} className="rounded border bg-white px-3 py-2" onClick={() => setSearch(new URLSearchParams({ tab: 'improvements' }))}>O4O 개선 요청</button>
    </nav>
    {showImprovements ? <ImprovementForum client={client} actorKey={user?.id ?? ''} management detailId={search.get('improvement') ?? undefined} onSelect={id => { const next = new URLSearchParams(search); next.set('tab', 'improvements'); if (id) next.set('improvement', id); else next.delete('improvement'); setSearch(next); }} /> : <>
    <form className="flex flex-wrap items-end gap-3 rounded border bg-white p-4" onSubmit={event => { event.preventDefault(); void create(); }}>
      <label>게시판 이름<input className="ml-2 rounded border px-3 py-2" maxLength={100} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></label>
      <button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy || !name.trim()}>{busy ? '만드는 중…' : '게시판 만들기'}</button>
    </form>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <CommunityBoardReview key={`requests:${version}`} communityKey="community" client={client} />
    <CommunityPublicReadManager key={`public:${version}`} communityKey="community" client={client} publicOrigin="https://community.neture.co.kr" />
    </>}
  </section>;
}
