/**
 * 운영자 — 강의 운영 목록 · 상태 관리 · publish/approval (WO Phase 2 §11 Operator)
 * 대상은 서버가 course.serviceKey='lecture' 로 고정 — 다른 서비스 강의는 보이지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseStatusBadge, LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { operatorApi, errorMessage, type CourseStatus, type LectureCourse } from '../../api/lecture';
import { useToast } from '../../components/Toast';

const STATUS_FILTERS: { key: '' | CourseStatus; label: string }[] = [
  { key: '', label: '전체' }, { key: 'pending_review', label: '검토 대기' }, { key: 'published', label: '게시 중' },
  { key: 'draft', label: '초안' }, { key: 'rejected', label: '반려' }, { key: 'archived', label: '보관' },
];

export default function OperatorCoursesPage() {
  const toast = useToast();
  const [status, setStatus] = useState<'' | CourseStatus>('pending_review');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LectureCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await operatorApi.courses({ limit: 100, ...(status ? { status } : {}), ...(search ? { search } : {}) });
      setItems(res.data ?? []);
    } catch (err) { setError(errorMessage(err, '강의 목록을 불러오지 못했습니다.')); }
    finally { setLoading(false); }
  }, [status, search]);
  useEffect(() => { void load(); }, [load]);

  async function act(id: string, label: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try { await fn(); toast.success(`${label} 완료`); await load(); }
    catch (err) { toast.error(errorMessage(err, `${label} 실패`)); }
    finally { setBusy(null); }
  }
  function reject(id: string) {
    const reason = window.prompt('반려 사유를 입력하세요.');
    if (!reason) return;
    void act(id, '반려', () => operatorApi.reject(id, reason));
  }

  return <main className="page page-wide">
    <div className="page-head row">
      <div><h1>강의 운영</h1><p className="muted">검토 요청된 강의를 승인·반려하고 게시 상태를 관리합니다.</p></div>
      <div className="row-actions"><Link className="btn btn-ghost" to="/operator/instructors">강사 관리</Link><Link className="btn btn-ghost" to="/operator/certificates">수료증 운영</Link></div>
    </div>
    <div className="toolbar">
      <div className="chips">{STATUS_FILTERS.map((f) => <button key={f.key} type="button" className={`chip${status === f.key ? ' on' : ''}`} onClick={() => setStatus(f.key)}>{f.label}</button>)}</div>
      <form className="search" onSubmit={(e) => { e.preventDefault(); void load(); }}><input value={search} placeholder="강의 검색" onChange={(e) => setSearch(e.target.value)} /><button type="submit" className="btn">검색</button></form>
    </div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="해당 상태의 강의가 없습니다" />}
    <ul className="list">
      {items.map((c) => <li key={c.id} className="list-item">
        <div className="list-main"><Link className="list-title" to={`/operator/courses/${c.id}/review`}>{c.title}</Link><CourseStatusBadge status={c.status} /></div>
        <div className="list-meta muted">강사 {c.instructorName ?? c.instructor?.name ?? c.instructorId} · 레슨 {c.lessonCount ?? 0} · 수강 {c.currentEnrollments ?? c.enrollmentCount ?? 0} · {c.visibility === 'members' ? '회원 전용' : '공개'}{c.rejectionReason ? ` · 반려 사유: ${c.rejectionReason}` : ''}</div>
        <div className="list-actions">
          {c.status === 'pending_review' && <>
            <button type="button" className="btn btn-primary" disabled={busy === c.id} onClick={() => void act(c.id, '승인·게시', () => operatorApi.approve(c.id))}>승인(게시)</button>
            <button type="button" className="btn btn-ghost danger" disabled={busy === c.id} onClick={() => reject(c.id)}>반려</button>
          </>}
          {(c.status === 'draft' || c.status === 'rejected') && <button type="button" className="btn" disabled={busy === c.id} onClick={() => void act(c.id, '게시', () => operatorApi.publish(c.id))}>강제 게시</button>}
          {c.status === 'published' && <button type="button" className="btn" disabled={busy === c.id} onClick={() => void act(c.id, '게시 중단', () => operatorApi.unpublish(c.id))}>게시 중단</button>}
          {c.status !== 'archived' && <button type="button" className="btn btn-ghost" disabled={busy === c.id} onClick={() => { if (window.confirm('보관 처리할까요?')) void act(c.id, '보관', () => operatorApi.archive(c.id)); }}>보관</button>}
        </div>
      </li>)}
    </ul>
  </main>;
}
