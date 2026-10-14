import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/apiClient';
import { communityOperatorErrorMessage } from '../../lib/api/communityOperator';

export default function CommunitySelfWithdrawal({ communityKey, name, onWithdrawn }: {
  communityKey: string; name: string; onWithdrawn: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const mounted = useRef(true);
  const opener = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (confirming) confirmButton.current?.focus(); }, [confirming]);
  const leave = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await api.post(`/communities/${encodeURIComponent(communityKey)}/leave`, {});
      if (mounted.current) onWithdrawn();
    } catch (e) {
      if (mounted.current) setError(communityOperatorErrorMessage(e, '탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return <section aria-label="커뮤니티 탈퇴" className="my-6 rounded-lg border border-slate-200 bg-white p-4 text-sm">
    <button ref={opener} type="button" hidden={confirming} onClick={() => setConfirming(true)} className="text-slate-600 underline">이 커뮤니티 탈퇴</button>
    {confirming && <>
      <h2 className="font-semibold">{name} 커뮤니티를 탈퇴하시겠습니까?</h2>
      <p className="mt-2 text-slate-600">이 커뮤니티의 개별 가입과 역할만 종료합니다. 공통 계정, 다른 서비스·커뮤니티 가입과 별도로 부여된 중앙 운영 권한은 유지됩니다.</p>
      <p className="mt-2 text-slate-600">작성한 글과 변경 이력은 보존됩니다. 개별 회원으로 다시 가입하려면 신청과 승인이 필요합니다.</p>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button ref={confirmButton} type="button" disabled={busy} onClick={leave} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{busy ? '탈퇴 처리 중…' : '탈퇴 확정'}</button>
        <button type="button" disabled={busy} onClick={() => { setConfirming(false); setError(''); requestAnimationFrame(() => opener.current?.focus()); }} className="rounded border px-4 py-2">취소</button>
      </div>
    </>}
  </section>;
}
