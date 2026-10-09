import { useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';

export default function CommunityBoardReview({ communityKey }: { communityKey: string }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; requesterName: string }>>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api.get(`/communities/${encodeURIComponent(communityKey)}/board-requests?review=true`).then((r: { data: { data: typeof rows } }) => {
      if (active) setRows(r.data.data);
    }).catch(() => { if (active) setError('게시판 개설 신청을 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [communityKey, version]);
  const review = async (id: string, action: 'approve' | 'reject') => {
    setBusy(true); setError('');
    try { await api.patch(`/communities/${encodeURIComponent(communityKey)}/board-requests/${id}`, { action }); setVersion(v => v + 1); }
    catch { setError('개설 신청을 처리하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  return <section className="my-4 rounded border p-4">
    <h2 className="font-semibold">게시판 개설 신청 심사</h2>
    {error && <p role="alert">{error}</p>}
    {rows.map(row => <div key={row.id} className="my-3 flex flex-wrap items-center gap-3">
      <span>{row.name} · {row.requesterName}</span><button disabled={busy} onClick={() => review(row.id, 'approve')}>승인</button><button disabled={busy} onClick={() => review(row.id, 'reject')}>반려</button>
    </div>)}
    {!rows.length && !error && <p className="text-sm text-slate-500">대기 중인 신청이 없습니다.</p>}
  </section>;
}
