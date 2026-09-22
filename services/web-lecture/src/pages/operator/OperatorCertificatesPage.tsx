/**
 * 운영자 — 수료증 운영: 발급 / 폐기 / 갱신 (WO Phase 2 §11 Operator)
 * 수료증 read 는 백엔드 소유권 경계상 본인 것만 열린다 — 운영 화면은 write 액션과 공개 진위 확인 링크만 제공한다.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { operatorApi, errorMessage, type LectureCertificate } from '../../api/lecture';
import { useToast } from '../../components/Toast';

export default function OperatorCertificatesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [issue, setIssue] = useState({ userId: '', courseId: '' });
  const [issued, setIssued] = useState<LectureCertificate | null>(null);
  const [targetId, setTargetId] = useState('');
  const [months, setMonths] = useState(12);
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); toast.success(`${label} 완료`); }
    catch (err) { toast.error(errorMessage(err, `${label} 실패`)); }
    finally { setBusy(false); }
  }

  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to="/operator">강의 운영</Link> / 수료증 운영</p><h1>수료증 운영</h1></div>

    <section className="panel">
      <h2>수동 발급</h2>
      <p className="muted">수료 조건을 충족한 학습자에게 발급합니다. 같은 학습자·강의 조합은 1회만 발급됩니다.</p>
      <div className="field-row">
        <label className="field grow"><span>학습자 userId</span><input value={issue.userId} onChange={(e) => setIssue({ ...issue, userId: e.target.value.trim() })} /></label>
        <label className="field grow"><span>강의 courseId</span><input value={issue.courseId} onChange={(e) => setIssue({ ...issue, courseId: e.target.value.trim() })} /></label>
      </div>
      <div className="row-actions"><button type="button" className="btn btn-primary" disabled={busy || !issue.userId || !issue.courseId} onClick={() => void run('발급', async () => { const res = await operatorApi.issueCertificate(issue); setIssued(res.data.certificate); })}>발급</button></div>
      {issued && <p className="notice">발급됨 — 번호 {issued.certificateNumber} · id {issued.id}{issued.verificationCode ? <> · <Link to={`/certificates/verify/${issued.verificationCode}`}>진위 확인</Link></> : null}</p>}
    </section>

    <section className="panel">
      <h2>폐기 · 갱신</h2>
      <label className="field"><span>수료증 id</span><input value={targetId} onChange={(e) => setTargetId(e.target.value.trim())} /></label>
      <div className="field-row">
        <label className="field"><span>갱신 기간(개월)</span><input type="number" min={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></label>
      </div>
      <div className="row-actions">
        <button type="button" className="btn" disabled={busy || !targetId} onClick={() => void run('갱신', () => operatorApi.renewCertificate(targetId, months))}>갱신</button>
        <button type="button" className="btn btn-ghost danger" disabled={busy || !targetId} onClick={() => { const reason = window.prompt('폐기 사유'); if (reason !== null) void run('폐기', () => operatorApi.revokeCertificate(targetId, reason)); }}>폐기</button>
      </div>
    </section>

    <section className="panel">
      <h2>진위 확인</h2>
      <form className="field-row" onSubmit={(e) => { e.preventDefault(); if (verifyCode) navigate(`/certificates/verify/${encodeURIComponent(verifyCode)}`); }}>
        <label className="field grow"><span>verificationCode</span><input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.trim())} /></label>
        <button type="submit" className="btn">확인</button>
      </form>
    </section>
  </main>;
}
