import { useCallback, useEffect, useRef, useState } from 'react';
import { operatorApi, errorMessage, type CertificateOperationRecord } from '../../api/lecture';

const labels = { issue: '발급', renew: '갱신', revoke: '폐기', update: '정보 수정' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '없음';

/** Keyed by the submitted target in the parent; obsolete responses never replace another target's history. */
export default function CertificateOperationHistory({ id, revision, disabled }: { id: string; revision: number; disabled: boolean }) {
  const state = useRef({ mounted: true, sequence: 0 });
  const [items, setItems] = useState<CertificateOperationRecord[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (next = 1) => {
    if (!id) return;
    const current = state.current;
    const sequence = ++current.sequence;
    const alive = () => current.mounted && sequence === current.sequence;
    setLoading(true); setError(''); setItems(null); setPage(next);
    try {
      const response = await operatorApi.certificateOperations(id, next);
      if (response.success === false || !Array.isArray(response.data.items)) throw Error('이력 응답을 확인해 주세요.');
      if (alive()) { setItems(response.data.items); setHasMore(response.data.hasMore); }
    } catch (cause) {
      if (alive()) setError(errorMessage(cause, '처리 이력을 불러오지 못했습니다.'));
    } finally { if (alive()) setLoading(false); }
  }, [id]);
  useEffect(() => {
    const current = state.current; current.mounted = true;
    if (revision > 0) void load();
    return () => { current.mounted = false; current.sequence++; };
  }, [load, revision]);
  return <section className="panel" aria-label="수료증 처리 이력">
    <h2>처리 이력</h2>
    <p className="muted">입력한 수료증의 보관된 운영 처리 기록입니다. 기록 시작 전 처리와 자동 발급 내역은 포함되지 않습니다.</p>
    {id && <p className="muted">대상: {id}</p>}
    <button type="button" className="btn" disabled={disabled || loading || !id} onClick={() => void load()}>처리 이력 조회</button>
    {loading && <p role="status">처리 이력 확인 중…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="btn" disabled={disabled || loading} onClick={() => void load(page)}>이력 다시 조회</button></div>}
    {items && <>
      {items.length === 0 && <p>기록된 처리 이력이 없습니다.</p>}
      <ul>{items.map(item => <li key={item.id} className="panel" style={{ overflowWrap: 'anywhere' }}>
        <strong>{labels[item.action] ?? '처리'}</strong> · {date(item.createdAt)}
        <p>처리자: {item.actorId ?? '기록 없음'}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>사유: {item.reason || '입력하지 않음'}</p>
        <p>폐기 상태: {item.before ? (item.before.isValid ? '미폐기' : '폐기') : '발급 전'} → {item.after.isValid ? '미폐기' : '폐기'}</p>
        <p>만료일: {date(item.before?.expiresAt ?? null)} → {date(item.after.expiresAt)}</p>
      </li>)}</ul>
      <div className="row-actions">
        <button type="button" className="btn" disabled={disabled || loading || page === 1} onClick={() => void load(page - 1)}>이전 이력</button>
        <span>{page} 페이지</span>
        <button type="button" className="btn" disabled={disabled || loading || !hasMore} onClick={() => void load(page + 1)}>다음 이력</button>
      </div>
    </>}
  </section>;
}
