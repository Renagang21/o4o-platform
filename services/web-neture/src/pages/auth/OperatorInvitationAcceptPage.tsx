/**
 * 운영자 초대 수락 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §10~§14
 *
 * `/operator-invitations/accept?token=...` (공개). 초대를 받은 사람은 아직 O4O 계정이 없을 수 있으므로
 * 로그인 상태를 요구하지 않는다. 접근 조건은 초대 토큰이고, 권한 부여는 **Google ID token 검증 뒤**에만 일어난다.
 *
 * 이 화면에 없는 것(계약):
 *   - 비밀번호 입력 · 비밀번호 설정 · 임시 비밀번호 안내  → 운영자 인증은 Google 하나다
 *   - 새 GIS 로더 · 새 Google 검증 구현                  → `@o4o/auth-client.renderGoogleButton` 재사용
 *   - 이메일 입력                                        → 수락 대상 이메일은 초대가 정한다(사용자가 바꿀 수 없다)
 *   - 외부 origin 으로의 이동                            → 성공 후 이동은 서비스 카탈로그가 정한 내부 경로뿐
 *
 * 이메일 비교(서버 §13)는 trim+lowercase 만 한다. 사용자가 "같은 계정인데 왜 안 되나" 를 알 수 있도록
 * INVITATION_EMAIL_MISMATCH 는 다른 오류와 구분해서 안내한다.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { renderGoogleButton } from '@o4o/auth-client';
import { authClient } from '../../lib/apiClient';

interface InvitationPreview {
  invitedEmail: string;
  serviceKey: string;
  serviceName: string;
  role: string;
  expiresAt: string;
}

type Stage =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string; code?: string }
  | { kind: 'ready'; clientId: string | null }
  | { kind: 'consent'; idToken: string }
  | { kind: 'busy' }
  | { kind: 'done'; serviceName: string; roleLabel: string; createdUser: boolean; idempotent: boolean };

/** 서버가 준 code 를 사용자가 다음에 무엇을 해야 하는지로 옮긴다. */
function messageForCode(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'INVITATION_EMAIL_MISMATCH':
      return '초대받은 이메일과 다른 Google 계정으로 로그인했습니다. 초대 메일을 받은 바로 그 이메일의 Google 계정으로 다시 시도해 주세요.';
    case 'INVITATION_EXPIRED':
      return '초대 유효기간이 지났습니다. 관리자에게 재전송을 요청해 주세요.';
    case 'INVITATION_CANCELLED':
      return '취소된 초대입니다. 관리자에게 문의해 주세요.';
    case 'INVITATION_NOT_FOUND':
      return '유효하지 않은 초대 링크입니다. 메일의 링크를 다시 확인해 주세요.';
    case 'INVITATION_ALREADY_ACCEPTED':
      return '이미 수락된 초대입니다. 그대로 로그인해서 사용하시면 됩니다.';
    case 'INVITATION_IDENTITY_CONFLICT':
    case 'EMAIL_IN_USE':
      // email 만으로 기존 계정과 자동 병합하지 않는다(§14) — 사람이 개입해야 하는 상태다.
      return '이 이메일로 이미 다른 계정이 있습니다. 자동으로 합치지 않으니 관리자에게 문의해 주세요.';
    case 'GOOGLE_EMAIL_UNVERIFIED':
      return 'Google 계정의 이메일이 확인되지 않았습니다. Google 에서 이메일 확인을 마친 뒤 다시 시도해 주세요.';
    case 'CONSENT_REQUIRED':
      return '약관과 개인정보 처리방침에 동의해야 계속할 수 있습니다.';
    default:
      return fallback;
  }
}

export default function OperatorInvitationAcceptPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /** 초대 미리보기 + 공개 Client ID. 둘 다 있어야 버튼을 보여줄 수 있다. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStage({ kind: 'invalid', message: '초대 토큰이 없습니다. 메일의 링크로 다시 접속해 주세요.' });
        return;
      }
      try {
        const res = await authClient.api.get('/operator-invitations/preview', { params: { token } });
        if (cancelled) return;
        setInvitation(res.data?.data as InvitationPreview);
      } catch (err: any) {
        if (cancelled) return;
        const code = err?.response?.data?.code;
        setStage({
          kind: 'invalid',
          code,
          message: messageForCode(code, err?.response?.data?.error || '초대 정보를 확인하지 못했습니다.'),
        });
        return;
      }
      try {
        const cfg = await authClient.getGoogleAuthConfig();
        if (cancelled) return;
        setStage({ kind: 'ready', clientId: cfg.enabled && cfg.clientId ? cfg.clientId : null });
      } catch {
        if (!cancelled) setStage({ kind: 'ready', clientId: null });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const submit = useCallback(async (idToken: string, consents?: { terms: boolean; privacy: boolean }) => {
    setError(null);
    setStage({ kind: 'busy' });
    try {
      const res = await authClient.api.post('/operator-invitations/accept', { token, idToken, consents });
      const data = res.data?.data ?? {};
      if (!mountedRef.current) return;
      setStage({
        kind: 'done',
        serviceName: invitation?.serviceName || data.serviceKey,
        roleLabel: invitation?.role || data.role,
        createdUser: !!data.createdUser,
        idempotent: !!data.idempotent,
      });
    } catch (err: any) {
      if (!mountedRef.current) return;
      const code = err?.response?.data?.code;
      if (code === 'CONSENT_REQUIRED') {
        // 신규 사용자다 — 동의를 받은 뒤 같은 ID token 으로 한 번 더 보낸다.
        setStage({ kind: 'consent', idToken });
        return;
      }
      setError(messageForCode(code, err?.response?.data?.error || '초대 수락에 실패했습니다.'));
      setStage({ kind: 'ready', clientId: null });
      // 버튼을 다시 그릴 수 있도록 config 를 재조회한다(취소·오류 후 재시도 경로).
      try {
        const cfg = await authClient.getGoogleAuthConfig();
        if (mountedRef.current) setStage({ kind: 'ready', clientId: cfg.enabled && cfg.clientId ? cfg.clientId : null });
      } catch { /* disabled 로 남긴다 */ }
    }
  }, [token, invitation]);

  /** Google 버튼 렌더 — 공통 로더만 쓴다(새 스크립트 로딩 코드를 만들지 않는다). */
  useEffect(() => {
    if (stage.kind !== 'ready' || !stage.clientId || !buttonRef.current) return;
    let dispose: (() => void) | undefined;
    void renderGoogleButton({
      clientId: stage.clientId,
      container: buttonRef.current,
      onCredential: (credential) => { void submit(credential); },
      onError: () => setError('Google 인증을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    }).then((d) => { dispose = d; });
    return () => dispose?.();
  }, [stage, submit]);

  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">운영자 초대 수락</h1>
        {children}
      </div>
    </div>
  );

  if (stage.kind === 'loading') {
    return shell(<p className="mt-4 text-sm text-slate-500">초대 정보를 확인하는 중입니다...</p>);
  }

  if (stage.kind === 'invalid') {
    return shell(
      <>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{stage.message}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">홈으로</Link>
      </>,
    );
  }

  if (stage.kind === 'done') {
    return shell(
      <>
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {stage.idempotent
            ? '이미 수락된 초대입니다. 권한은 그대로 유지됩니다.'
            : `${stage.serviceName} 운영 권한(${stage.roleLabel})이 부여되었습니다.`}
        </p>
        {stage.createdUser && (
          <p className="mt-2 text-sm text-slate-600">
            계정이 새로 만들어졌습니다. 앞으로 <b>Google 로그인</b>으로 접속하세요. 별도의 비밀번호는 없습니다.
          </p>
        )}
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">시작하기</Link>
      </>,
    );
  }

  return shell(
    <>
      {invitation && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="text-slate-700">
            <b>{invitation.serviceName}</b> 운영자
            {invitation.role ? ` (${invitation.role})` : ''} 초대
          </div>
          <div className="mt-1 break-all text-slate-600">대상 이메일: {invitation.invitedEmail}</div>
          <div className="mt-1 text-xs text-slate-500">
            유효기간: {new Date(invitation.expiresAt).toLocaleString('ko-KR')}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}

      {stage.kind === 'busy' && <p className="mt-4 text-sm text-slate-500">처리 중입니다...</p>}

      {stage.kind === 'consent' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">처음 이용하시는군요. 계속하려면 아래에 동의해 주세요.</p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
            <span>
              <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">이용약관</a>에 동의합니다. (필수)
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
            <span>
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">개인정보 처리방침</a>에 동의합니다. (필수)
            </span>
          </label>
          <button
            type="button"
            disabled={!terms || !privacy}
            onClick={() => void submit(stage.idToken, { terms, privacy })}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            동의하고 계속하기
          </button>
        </div>
      )}

      {stage.kind === 'ready' && (
        <div className="mt-4">
          {stage.clientId ? (
            <>
              <p className="mb-2 text-sm text-slate-600">
                초대받은 <b>{invitation?.invitedEmail}</b> 계정의 Google 로 계속하세요.
                비밀번호는 필요하지 않습니다.
              </p>
              <div ref={buttonRef} />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Google 로그인이 현재 준비되지 않았습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.
            </p>
          )}
        </div>
      )}
    </>,
  );
}
