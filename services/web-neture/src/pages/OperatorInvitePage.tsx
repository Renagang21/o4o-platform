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
    adminOperations?: boolean; defaultDailyDuties?: boolean; centralDelegation?: boolean; scopeName?: string; menuLabels?: string[];
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
          data: { data: { serviceKey: string; role: string; purpose: string; adminOperations?: boolean; defaultDailyDuties?: boolean; centralDelegation?: boolean; scopeName?: string; menuLabels?: string[] } };
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
        `${preview?.adminOperations ? '업무 운영자 지정' : `${result.serviceKey} · ${result.role}`} 확인·수락을 완료했습니다.${statuses.some((s) => s !== 'active') ? ' 기존 서비스 가입 상태는 유지됩니다. 서비스 가입 승인·정지 상태를 확인하세요.' : preview?.adminOperations ? ' 업무 운영 화면에서 Google로 로그인해 접근을 확인하세요.' : ' 서비스 운영 화면에서 접근을 확인하세요.'}`,
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
              `${preview.scopeName || preview.serviceKey} · ${preview.adminOperations ? '업무 운영자' : preview.role.startsWith('cooperative:') ? (preview.role.endsWith(':admin') ? '조합 관리자' : '조합 운영자') : (preview.role.endsWith(':admin') || preview.role.endsWith('_admin') ? '서비스 관리자' : '서비스 운영자')} · 신규 운영자 초대`}
          </p>
          {preview?.centralDelegation && <p>관리자 사이트의 업무 위임입니다. 수락 후 <a href="https://admin.neture.co.kr/operations">업무 운영</a>에서 Google로 로그인하세요.</p>}
          {preview?.centralDelegation && <section><h2>위임받는 운영 업무</h2>{preview.defaultDailyDuties ? <p>수락하면 일상업무 전체를 기본으로 제공합니다. 담당 업무는 관리자가 나중에 변경할 수 있습니다. 전체 관리자·서비스 Admin 권한은 포함하지 않습니다.</p> : preview.menuLabels?.length ? <ul>{preview.menuLabels.map(label => <li key={label}>{label}</li>)}</ul> : <p>위임된 메뉴가 없습니다. 중앙 관리자에게 업무 설정을 요청하세요.</p>}</section>}
          <p>초대는 최초 7일 동안 유효합니다. 수락·취소·만료 시 초대용 이메일과 토큰을 파기하고, 권한 변경 최소 이력은 생성 후 달력 1년 보관합니다.</p>
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
