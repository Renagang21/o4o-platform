import { useEffect, useRef, useState } from 'react';
import { operatorApi, errorMessage, type MissingCertificate } from '../../api/lecture';

export function CertificateRecoveryQueue({ busy, onIssue }: { busy: boolean; onIssue: (item: MissingCertificate) => Promise<boolean> }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MissingCertificate[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  async function load(query: string) {
    const id = ++request.current; setLoading(true); setError('');
    try { const res = await operatorApi.missingCertificates(query); if (id === request.current) setItems(res.data.items); }
    catch (err) { if (id === request.current) setError(errorMessage(err, '미발급 수료 목록을 불러오지 못했습니다.')); }
    finally { if (id === request.current) setLoading(false); }
  }
  useEffect(() => { void load(''); return () => { request.current += 1; }; }, []);
  return <section className="panel"><h2>수료 후 미발급 건 복구</h2>
    <p className="muted">수료는 완료됐지만 수료증이 없는 최근 100건입니다. 발급 실패 시 학습 완료 상태는 유지됩니다.</p>
    <form className="field-row" onSubmit={e => { e.preventDefault(); void load(search); }}><label className="field grow"><span>학습자 이름 · 강의 제목 검색</span><input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /></label><button className="btn" type="submit" disabled={loading || busy}>조회 · 새로고침</button></form>
    {loading ? <p role="status">불러오는 중...</p> : error ? <p role="alert">{error}</p> : items.length === 0 ? <p>검색 조건에 해당하는 미발급 수료 건이 없습니다.</p> : <ul className="list">{items.map(item => <li key={item.enrollmentId} className="list-item"><span>{item.userName ?? '학습자'} · {item.courseTitle}</span><button type="button" className="btn" disabled={busy} onClick={async () => { if (await onIssue(item)) void load(search); }}>수료증 발급 재시도</button></li>)}</ul>}
  </section>;
}
