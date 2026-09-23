/**
 * 운영자 — 강사 신청 관리 (승인 시 서버가 `lecture:instructor` 부여) (WO Phase 2 §11 Operator)
 * §12: KPA 약사 자격 확인 없음 — Lecture 운영자 판단만으로 승인한다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { operatorApi, errorMessage, type InstructorApplication } from '../../api/lecture';
import { useToast } from '../../components/Toast';

const STATUS: { key: string; label: string }[] = [{ key: 'pending', label: '대기' }, { key: 'approved', label: '승인' }, { key: 'rejected', label: '반려' }, { key: '', label: '전체' }];

export default function OperatorInstructorsPage() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState<InstructorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await operatorApi.applications({ limit: 100, ...(status ? { status } : {}) }); setItems(res.data ?? []); }
    catch (err) { setError(errorMessage(err, '강사 신청 목록을 불러오지 못했습니다.')); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setBusy(id);
    try { await operatorApi.approveApplication(id); toast.success('승인했습니다. lecture:instructor 역할이 부여됩니다.'); await load(); }
    catch (err) { toast.error(errorMessage(err, '승인에 실패했습니다.')); }
    finally { setBusy(null); }
  }
  async function reject(id: string) {
    const reason = window.prompt('반려 사유를 입력하세요.');
    if (reason === null) return;
    setBusy(id);
    try { await operatorApi.rejectApplication(id, reason); toast.success('반려했습니다.'); await load(); }
    catch (err) { toast.error(errorMessage(err, '반려에 실패했습니다.')); }
    finally { setBusy(null); }
  }

  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to="/operator">강의 운영</Link> / 강사 관리</p><h1>강사 신청 관리</h1><p className="muted">승인하면 신청자에게 강사 역할이 부여되어 강의를 개설할 수 있습니다.</p></div>
    <div className="toolbar"><div className="chips">{STATUS.map((f) => <button key={f.key} type="button" className={`chip${status === f.key ? ' on' : ''}`} onClick={() => setStatus(f.key)}>{f.label}</button>)}</div></div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="해당 상태의 신청이 없습니다" />}
    <ul className="list">
      {items.map((a) => <li key={a.id} className="list-item">
        <div className="list-main"><span className="list-title">{a.user?.name ?? a.user?.email ?? a.userId}</span><span className={`badge badge-${a.status}`}>{a.status}</span></div>
        <div className="list-meta muted">{a.user?.email} · 신청 {a.createdAt?.slice(0, 10)}{a.reviewNote ? ` · 메모: ${a.reviewNote}` : ''}</div>
        {a.status === 'pending' && <div className="list-actions">
          <button type="button" className="btn btn-primary" disabled={busy === a.id} onClick={() => void approve(a.id)}>승인</button>
          <button type="button" className="btn btn-ghost danger" disabled={busy === a.id} onClick={() => void reject(a.id)}>반려</button>
        </div>}
      </li>)}
    </ul>
  </main>;
}
