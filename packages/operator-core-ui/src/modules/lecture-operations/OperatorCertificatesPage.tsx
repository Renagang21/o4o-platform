/**
 * 운영자 — 수료증 운영: 발급 / 폐기 / 갱신 (WO Phase 2 §11 Operator)
 * 수료증 read 는 백엔드 소유권 경계상 본인 것만 열린다 — 운영 화면은 write 액션·공개 진위 링크와 별도 권한의 처리 이력만 제공한다.
 */
import { type CertificateOperation, type CertificateState } from './api';
import { useLectureBindings } from './runtime';
import { CertificateRecoveryQueue } from './CertificateRecoveryQueue';
import { useEffect, useRef, useState } from 'react';
import { OperationLink as Link, useOperationNavigate as useNavigate } from './runtime';
import { useOperatorCertificates } from './useOperatorCertificates';
import OperatorReasonDialog from './OperatorReasonDialog';

const ACTION_LABEL: Record<CertificateOperation['action'], string> = { issue: '발급', renew: '갱신', update: '수정', revoke: '폐기' };
function describeState(state: CertificateState | null) {
  if (!state) return '없음';
  const validity = state.isValid === false ? '무효' : '유효';
  return state.expiresAt ? `${validity}(만료 ${new Date(state.expiresAt).toLocaleDateString('ko-KR')})` : validity;
}
function describeOperation(op: CertificateOperation) {
  const actor = op.actorId ? `처리자 ${op.actorId}` : op.trigger === 'completion' ? '수료 시 자동' : '처리자 미기록';
  const detail = op.action === 'renew' && op.months ? ` · ${op.months}개월`
    : op.action === 'update' && op.changedFields?.length ? ` · ${op.changedFields.join(', ')}`
    : op.action === 'revoke' ? ` · ${op.reason || '사유 미입력'}` : '';
  const change = op.before || op.after ? ` · ${describeState(op.before)} → ${describeState(op.after)}` : '';
  return `${new Date(op.at).toLocaleString('ko-KR')} · ${ACTION_LABEL[op.action] ?? op.action} · ${actor}${detail}${change}`;
}

export default function OperatorCertificatesPage() {
  const { api: operatorApi } = useLectureBindings();
  const navigate = useNavigate();
  const { issue, setIssue, issued: result, targetId, setTargetId, months, setMonths, validMonths, verifyCode, setVerifyCode, busy, message, execute, clearMessage } = useOperatorCertificates();
  const issued = result?.certificate;
  const [revoking, setRevoking] = useState<string | null>(null);

  const [operations, setOperations] = useState<CertificateOperation[]>([]);
  const [historyPage, setHistoryPage] = useState<{ page: number; hasMore: boolean } | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyBusy, setHistoryBusy] = useState(false);
  const historySeq = useRef({ seq: 0 });
  useEffect(() => { const state = { seq: 0 }; historySeq.current = state; setOperations([]); setHistoryPage(null); setHistoryError(''); setHistoryBusy(false); return () => { state.seq++; }; }, [targetId]);
  async function loadHistory(page = 1) {
    const state = historySeq.current; const seq = ++state.seq;
    setHistoryBusy(true); setHistoryError('');
    try { const r = await operatorApi.certificateOperations(targetId, page);
      if (seq === state.seq) {
        setOperations(prev => [...(page === 1 ? [] : prev), ...(r.data?.operations ?? [])]);
        setHistoryPage({ page, hasMore: !!r.data?.hasMore });
      }
    } catch { if (seq === state.seq) { if (page === 1) setOperations([]); setHistoryError('처리 이력을 조회하지 못했습니다. 대상과 운영 권한을 확인해 주세요.'); } }
    finally { if (seq === state.seq) setHistoryBusy(false); }
  }
  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to="/operator">강의 운영</Link> / 수료증 운영</p><h1>수료증 운영</h1></div>
    {message && <p role={message.error ? 'alert' : 'status'} className={`notice${message.error ? ' notice-error' : ''}`}>{message.text}</p>}

    <CertificateRecoveryQueue busy={busy} onIssue={item => execute({ kind: 'issue', userId: item.userId, courseId: item.courseId })} />

    <section className="panel">
      <h2>수동 발급</h2>
      <p className="muted">수료 조건을 충족한 학습자에게 발급합니다. 같은 학습자·강의 조합은 1회만 발급됩니다.</p>
      <div className="field-row">
        <label className="field grow"><span>학습자 userId</span><input disabled={busy} value={issue.userId} onChange={(e) => setIssue({ ...issue, userId: e.target.value.trim() })} /></label>
        <label className="field grow"><span>강의 courseId</span><input disabled={busy} value={issue.courseId} onChange={(e) => setIssue({ ...issue, courseId: e.target.value.trim() })} /></label>
      </div>
      <div className="row-actions"><button type="button" className="btn btn-primary" disabled={busy || !issue.userId || !issue.courseId} onClick={() => void execute({ kind: 'issue', ...issue })}>발급</button></div>
      {issued && <p className="notice">발급됨 — 학습자 {result?.userId} · 강의 {result?.courseId} · 번호 {issued.certificateNumber} · id {issued.id}{issued.verificationCode ? <> · <Link to={`/certificates/verify/${issued.verificationCode}`}>진위 확인</Link></> : null}</p>}
    </section>

    <section className="panel">
      <h2>폐기 · 갱신</h2>
      <label className="field"><span>수료증 id</span><input disabled={busy} value={targetId} onChange={(e) => setTargetId(e.target.value.trim())} /></label>
      <div className="field-row">
        <label className="field"><span>갱신 기간(개월)</span><input disabled={busy} type="number" min={1} step={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></label>
      </div>
      {!validMonths && <p role="alert">갱신 기간은 1개월 이상의 정수로 입력하세요.</p>}
      <div className="row-actions">
        <button type="button" className="btn" disabled={busy || !targetId || !validMonths} onClick={() => void execute({ kind: 'renew', id: targetId, months })}>갱신</button>
        <button type="button" className="btn btn-ghost danger" disabled={busy || !targetId} onClick={() => { clearMessage(); setRevoking(targetId); }}>폐기</button>
      </div>
      <button type="button" className="btn" disabled={busy || historyBusy || !targetId} onClick={() => void loadHistory()}>처리 이력 조회</button>
      {historyError && <p role="alert">{historyError}</p>}
      <ul aria-label="수료증 처리 이력">{operations.map((op, i) => <li key={`${op.at}:${i}`}>{describeOperation(op)}</li>)}</ul>
      {historyPage?.hasMore && <button type="button" className="btn btn-ghost" disabled={busy || historyBusy} onClick={() => void loadHistory(historyPage.page + 1)}>이전 이력 더 보기</button>}
      {historyPage && !operations.length && <p className="muted">기록된 처리 이력이 없습니다.</p>}
      <p className="muted">발급·갱신·수정·폐기의 수행자와 전후 상태, 폐기 사유를 운영자에게만 보여 줍니다. 기록 이전의 처리는 복원하지 않습니다.</p>
    </section>

    <section className="panel">
      <h2>진위 확인</h2>
      <form className="field-row" onSubmit={(e) => { e.preventDefault(); if (verifyCode) navigate(`/certificates/verify/${encodeURIComponent(verifyCode)}`); }}>
        <label className="field grow"><span>verificationCode</span><input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.trim())} /></label>
        <button type="submit" className="btn">확인</button>
      </form>
    </section>
    {revoking && <OperatorReasonDialog key={revoking} title="수료증 폐기" target={revoking} busy={busy} error={message?.error ? message.text : null} allowEmpty onCancel={() => setRevoking(null)} onConfirm={async reason => { if (await execute({ kind: 'revoke', id: revoking, reason })) setRevoking(null); }} />}
  </main>;
}
