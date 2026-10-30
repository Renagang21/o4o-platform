/**
 * 운영자 — 강사 신청 관리 (승인 시 서버가 `lecture:instructor` 부여) (WO Phase 2 §11 Operator)
 * §12: KPA 약사 자격 확인 없음 — Lecture 운영자 판단만으로 승인한다.
 */
import { useCallback, useState } from 'react';
import { OperationLink as Link } from './runtime';
import { LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { useLectureBindings } from './runtime';
import { useOperatorQueue } from './useOperatorQueue';
import OperatorReasonDialog from './OperatorReasonDialog';

const STATUS: { key: string; label: string }[] = [{ key: 'pending', label: '대기' }, { key: 'approved', label: '승인' }, { key: 'rejected', label: '반려' }, { key: '', label: '전체' }];

export default function OperatorInstructorsPage() {
  const { api: operatorApi } = useLectureBindings();
  const [status, setStatus] = useState('pending');
  const fetch = useCallback(() => operatorApi.applications({ limit: 100, ...(status ? { status } : {}) }), [status]);
  const [rejection, setRejection] = useState<{ id: string; label: string; scope: string } | null>(null);
  const { items, loading, error, busy, actionError, refreshNotice, clearActionError, load, run } = useOperatorQueue(status, fetch, '강사 신청 목록을 불러오지 못했습니다.');

  async function approve(id: string) {
    await run(id, () => operatorApi.approveApplication(id), '승인했습니다. lecture:instructor 역할이 부여됩니다.', '승인에 실패했습니다.');
  }
  const decision = rejection?.scope === status ? rejection : null;
  const reject = async (reason: string) => {
    if (decision && await run(decision.id, () => operatorApi.rejectApplication(decision.id, reason), '반려했습니다.', '반려에 실패했습니다.')) setRejection(null);
  };

  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to="/operator">강의 운영</Link> / 강사 관리</p><h1>강사 신청 관리</h1><p className="muted">승인하면 신청자에게 강사 역할이 부여되어 강의를 개설할 수 있습니다.</p></div>
    <div className="toolbar"><div className="chips">{STATUS.map((f) => <button key={f.key} type="button" disabled={busy !== null} className={`chip${status === f.key ? ' on' : ''}`} onClick={() => { setRejection(null); setStatus(f.key); }}>{f.label}</button>)}</div></div>
    {refreshNotice && <p role="status" className="notice">{refreshNotice}</p>}
    {actionError && !decision && <p role="alert" className="notice notice-error">{actionError}</p>}
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div role="alert" className="notice notice-error">{error} <button type="button" className="btn" disabled={busy !== null} onClick={() => void load()}>다시 조회</button></div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="해당 상태의 신청이 없습니다" />}
    <ul className="list">
      {items.map((a) => <li key={a.id} className="list-item">
        <div className="list-main"><span className="list-title">{a.user?.name ?? a.user?.email ?? a.userId}</span><span className={`badge badge-${a.status}`}>{a.status}</span></div>
        <div className="list-meta muted">{a.user?.email} · 신청 {a.createdAt?.slice(0, 10)}{a.reviewNote ? ` · 메모: ${a.reviewNote}` : ''}</div>
        {(a.bio || a.expertise) && <dl className="list-meta" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {a.bio && <><dt>강사 소개</dt><dd>{a.bio}</dd></>}
          {a.expertise && <><dt>전문 분야</dt><dd>{a.expertise}</dd></>}
        </dl>}
        {a.status === 'pending' && <div className="list-actions">
          <button type="button" className="btn btn-primary" disabled={busy !== null || loading || !!error} onClick={() => void approve(a.id)}>승인</button>
          <button type="button" className="btn btn-ghost danger" disabled={busy !== null || loading || !!error} onClick={() => { clearActionError(); setRejection({ id: a.id, label: a.user?.name ?? a.userId, scope: status }); }}>반려</button>
        </div>}
      </li>)}
    </ul>
    {decision && <OperatorReasonDialog key={`${decision.scope}:${decision.id}`} title="강사 신청 반려" target={decision.label} busy={busy !== null} error={actionError} allowEmpty onConfirm={reason => void reject(reason)} onCancel={() => setRejection(null)} />}
  </main>;
}
