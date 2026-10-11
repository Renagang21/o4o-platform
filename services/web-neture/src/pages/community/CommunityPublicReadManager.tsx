import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';

type Mode = 'private' | 'board' | 'selected';
interface Board { id: string; name: string; forumType: string; publicRead: { mode: Mode; postIds?: string[] } }
interface Post { id: string; forumId: string; title: string }
interface Settings { boards: Board[]; posts: Post[] }

function BoardSetting({ communityKey, board, posts }: { communityKey: string; board: Board; posts: Post[] }) {
  const [mode, setMode] = useState<Mode>(board.forumType === 'open' && ['board', 'selected'].includes(board.publicRead?.mode) ? board.publicRead.mode : 'private');
  const [ids, setIds] = useState<string[]>(board.publicRead?.postIds ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const closed = board.forumType !== 'open';
  async function save() {
    setBusy(true); setMessage(''); setError('');
    try {
      await api.put(`/communities/${encodeURIComponent(communityKey)}/boards/${board.id}/public-read`, { mode, postIds: mode === 'selected' ? ids : [] });
      setMessage(mode === 'private' ? '비로그인 공개를 해제했습니다.' : '선택한 공개 범위를 저장했습니다.');
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(detail ?? '공개 범위를 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }
  return <fieldset disabled={busy} className="min-w-0 rounded-lg border p-4 [overflow-wrap:anywhere]">
    <legend className="px-2 font-medium">{board.name}</legend>
    <label className="flex flex-wrap items-center gap-3">비로그인 열람
      <select aria-label={`${board.name} 공개 범위`} value={mode} onChange={e => { setMode(e.target.value as Mode); setMessage(''); }} className="min-h-11 max-w-full rounded border px-3">
        <option value="private">회원 전용</option>
        {!closed && <><option value="board">게시판 전체 공개</option><option value="selected">선택한 글만 공개</option></>}
      </select>
    </label>
    {closed ? <p className="mt-3 text-sm text-slate-600">폐쇄 게시판은 회원 전용으로 유지됩니다.</p> : mode === 'board' ?
      <p className="mt-3 text-sm text-amber-800">현재 및 앞으로 게시되는 이 게시판의 글 본문을 로그인 없이 볼 수 있습니다. 회원 정보와 댓글은 공개되지 않습니다.</p> : mode === 'selected' && <div className="mt-3">
        <p className="mb-2 text-sm text-slate-600">게시된 글만 선택하세요. 선택한 글의 제목과 본문이 공개됩니다(최대 100개).</p>
        <ul className="max-h-72 space-y-2 overflow-y-auto">{posts.map(post => <li key={post.id}><label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 shrink-0" checked={ids.includes(post.id)} onChange={e => setIds(old => e.target.checked ? [...old, post.id] : old.filter(id => id !== post.id))} />{post.title}
        </label></li>)}</ul>
        {!posts.length && <p className="text-sm text-slate-500">선택할 게시글이 없습니다.</p>}
        <p className="mt-2 text-xs text-slate-500">선택 {ids.length}개 · 최근 게시된 글에서 선택합니다. 기존 선택은 목록에 없어도 유지됩니다.</p>
      </div>}
    <button type="button" onClick={() => void save()} className="mt-4 min-h-11 rounded bg-blue-700 px-4 py-2 text-sm text-white">{busy ? '저장 중…' : '공개 설정 저장'}</button>
    {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </fieldset>;
}

export default function CommunityPublicReadManager({ communityKey }: { communityKey: string }) {
  const [data, setData] = useState<Settings | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    api.get(`/communities/${encodeURIComponent(communityKey)}/public-read-settings`)
      .then((r: { data: { data: Settings } }) => { if (alive) setData(r.data.data); })
      .catch(() => { if (alive) setError('게시판 공개 설정을 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [communityKey, retry]);
  return <details className="my-5 rounded-xl border bg-white p-4">
    <summary className="min-h-11 cursor-pointer font-medium">운영자 · 비로그인 공개 설정</summary>
    <p className="my-3 text-sm text-slate-600">기존 자료는 회원 전용입니다. 공개할 게시판이나 글을 명시적으로 선택하고 저장해 주세요.</p>
    <Link to={`/communities/${encodeURIComponent(communityKey)}/public`} className="text-sm text-blue-700">공개 열람 화면 확인 →</Link>
    {error && <div role="alert" className="mt-4"><p>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)} className="mt-2 min-h-11 text-blue-700">다시 시도</button></div>}
    {!data && !error && <output aria-live="polite" className="mt-4 block">공개 설정을 불러오는 중…</output>}
    {data && <div className="mt-4 space-y-4">{data.boards.map(board => <BoardSetting key={board.id} communityKey={communityKey} board={board} posts={data.posts.filter(post => post.forumId === board.id)} />)}</div>}
    {data && !data.boards.length && <p className="mt-4 text-sm text-slate-500">개설된 게시판이 없습니다.</p>}
  </details>;
}
