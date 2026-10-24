import { useLayoutEffect, useRef, useState } from 'react';
import { operatorApi, errorMessage, type LectureCertificate } from '../../api/lecture';
import { useToast } from '../../components/Toast';

type CertificateAction = { kind: 'issue'; userId: string; courseId: string }
  | { kind: 'renew'; id: string; months: number }
  | { kind: 'revoke'; id: string; reason: string };

/** Certificate commands retain their submitted target; operator-wide read access is unchanged. */
export function useOperatorCertificates() {
  const toast = useToast();
  const lifecycle = useRef({ mounted: false, pending: false });
  // A failed renew/revoke retried with the same input reuses its operationId, so a request that reached the
  // server before the failure is not applied twice. Success or a different input starts a new id.
  const retry = useRef<{ key: string; id: string } | null>(null);
  const [issue, setIssue] = useState({ userId: '', courseId: '' });
  const [issued, setIssued] = useState<{ certificate: LectureCertificate; userId: string; courseId: string } | null>(null);
  const [targetId, setTargetId] = useState('');
  const [months, setMonths] = useState(12);
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const validMonths = Number.isInteger(months) && months >= 1;
  useLayoutEffect(() => {
    const state = lifecycle.current; state.mounted = true;
    return () => { state.mounted = false; };
  }, []);

  async function execute(action: CertificateAction) {
    const state = lifecycle.current;
    if (!state.mounted || state.pending) return false;
    if (action.kind === 'issue' && (!action.userId || !action.courseId)) return false;
    if (action.kind !== 'issue' && !action.id) return false;
    if (action.kind === 'renew' && (!Number.isInteger(action.months) || action.months < 1)) return false;
    state.pending = true; setBusy(true); setMessage(null);
    const label = action.kind === 'issue' ? '발급' : action.kind === 'renew' ? '갱신' : '폐기';
    const target = action.kind === 'issue' ? `학습자 ${action.userId} · 강의 ${action.courseId}` : `수료증 ${action.id}${action.kind === 'renew' ? ` · ${action.months}개월` : ''}`;
    try {
      if (action.kind === 'issue') {
        const response = await operatorApi.issueCertificate({ userId: action.userId, courseId: action.courseId });
        if (!state.mounted) return false;
        const certificate = response.data.certificate;
        setIssued({ certificate, userId: action.userId, courseId: action.courseId });
        setTargetId(certificate.id); setVerifyCode(certificate.verificationCode ?? '');
      } else {
        const key = JSON.stringify(action);
        if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
        if (action.kind === 'renew') await operatorApi.renewCertificate(action.id, action.months, retry.current.id);
        else await operatorApi.revokeCertificate(action.id, action.reason, retry.current.id);
        retry.current = null;
      }
      if (!state.mounted) return false;
      setMessage({ error: false, text: `${label} 완료 · ${target}` }); toast.success(`${label} 완료`);
      return true;
    } catch (err) {
      if (state.mounted) { const text = errorMessage(err, `${label} 실패`); setMessage({ error: true, text: `${text} · ${target}` }); toast.error(text); }
      return false;
    } finally { if (state.mounted) { state.pending = false; setBusy(false); } }
  }
  return { issue, setIssue, issued, targetId, setTargetId, months, setMonths, validMonths,
    verifyCode, setVerifyCode, busy, message, execute, clearMessage: () => setMessage(null) };
}
