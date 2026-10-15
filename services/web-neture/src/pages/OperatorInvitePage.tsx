import { useEffect, useState } from 'react';
import { useAuth, useLoginModal } from '../contexts';
import { api } from '../lib/apiClient';

import { clearOperatorInvitation, clearOperatorInvitationEntry, readOperatorInvitation, rememberOperatorInvitation } from '../lib/operatorInvitationReturn';
/** Fragment tokens stay out of request URLs, access logs and login return URLs. GET never accepts. */
export default function OperatorInvitePage() {
  const { user, isAuthenticated, isLoading, refreshAuth } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [token] = useState(() => {
    const hadFragment = !!window.location.hash;
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get(
      'token',
    );
    // Scrub the fragment before optional browser storage; StrictMode may initialize twice.
    if (hadFragment) window.history.replaceState(null, '', window.location.pathname);
    if (incoming && /^[a-f0-9]{64}$/.test(incoming)) {
      rememberOperatorInvitation(incoming);
      return incoming;
    }
    if (hadFragment) {
      clearOperatorInvitationEntry();
      return '';
    }
    return readOperatorInvitation();
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<{
    serviceKey: string;
    role: string;
    purpose: string;
  } | null>(null);
  useEffect(() => {
    let current = true;
    setPreview(null);
    setMessage('');
    setDone(false);
    if (!isAuthenticated || !token) return;
    void api
      .post('/service-operator-invitations/inspect', { token })
      .then(
        (res: {
          data: { data: { serviceKey: string; role: string; purpose: string } };
        }) => {
          if (current) setPreview(res.data.data);
        },
      )
      .catch((e: unknown) => {
        if (!current) return;
        const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
        if (code === 'INVALID_OR_EXPIRED_INVITATION') clearOperatorInvitation(token);
        setMessage(code === 'INVITATION_ACCOUNT_MISMATCH'
          ? '지정된 계정과 다릅니다. 지정된 계정으로 다시 로그인하세요.'
          : '유효한 초대를 확인하지 못했습니다. 이미 처리되었거나 만료·취소된 링크인지 확인하세요.');
      });
    return () => {
      current = false;
    };
  }, [isAuthenticated, user?.id, token]);
  const accept = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await api.post('/service-operator-invitations/accept', {
        token,
      });
      const result = response.data.data;
      clearOperatorInvitation(token);
      setDone(true);
      const statuses = Object.values(result.membershipStatuses ?? {});
      setMessage(
        `${result.serviceKey} · ${result.role} 확인·수락을 완료했습니다.${statuses.some((s) => s !== 'active') ? ' 기존 서비스 가입 상태는 유지됩니다. 서비스 가입 승인·정지 상태를 확인하세요.' : ' 서비스 운영 화면에서 접근을 확인하세요.'}`,
      );
      void refreshAuth().catch(() => {
        /* Acceptance succeeded; refresh failure must not be reported as failed acceptance. */
      });
    } catch (e) {
      const code = (e as { response?: { data?: { code?: string } } }).response
        ?.data?.code;
      if (code === 'INVALID_OR_EXPIRED_INVITATION') clearOperatorInvitation(token);
      setMessage(
        code === 'INVITATION_ACCOUNT_MISMATCH'
          ? '초대에 지정된 계정과 다릅니다. 지정된 계정으로 로그인하세요.'
          : '수락하지 못했습니다. 링크 만료·취소 또는 권한 회수 여부를 관리자에게 확인하세요.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <h1 className="text-2xl font-bold">서비스 운영자 초대 · 지정 확인</h1>
      <p>
        메일을 받은 본인이 로그인하거나 가입한 뒤, 운영 업무에 사용할 계정과
        지정 내용을 확인해 주세요.
      </p>
      {isLoading ? (
        <p>로그인 확인 중...</p>
      ) : !isAuthenticated ? (
        <button
          className="rounded-lg bg-blue-600 px-4 py-3 text-white"
          onClick={() => openLoginModal('/operator-invite')}
        >
          로그인 / 가입
        </button>
      ) : (
        <>
          <p>
            수락할 계정: {user?.name} ({user?.email})
          </p>
          <p>
            이 계정으로 운영 업무를 수행하는 데 동의하면 수락하세요. 계정이
            다르면 로그아웃 후 다시 로그인하세요.
          </p>
          <p>
            {preview &&
              `${preview.serviceKey} · ${preview.role} · ${preview.purpose === 'confirmation' ? '기존 지정 확인' : '신규 운영자 초대'}`}
          </p>
          <button
            className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:bg-slate-300 disabled:text-slate-600"
            disabled={!token || !preview || busy || done}
            onClick={() => void accept()}
          >
            {done
              ? '확인·수락 완료'
              : busy
                ? '확인 중...'
                : '이 계정으로 확인·수락'}
          </button>
        </>
      )}
      {!token && <p role="alert">메일의 초대 링크를 열어 주세요.</p>}
      {message && <p role="status">{message}</p>}
    </main>
  );
}
