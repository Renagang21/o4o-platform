import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PasswordInput } from './email/PasswordInput';
import { renderGoogleButton, redirectToKakao, takeSocialCallback, type AuthClient, type SocialAccountsStatus, type SocialGrant, type SocialProvider, type SocialProof } from '@o4o/auth-client';

/** Current account proof, separate target proof, and an explicit final write. No unlink or users.id merge. */
export function SocialAccountConnections({ client }: { client: AuthClient }) {
  const [status, setStatus] = useState<SocialAccountsStatus>();
  const [message, setMessage] = useState(''); const [password, setPassword] = useState('');
  const [permit, setPermit] = useState<string>();
  const [challenge, setChallenge] = useState<{ grant: SocialGrant; kind: 'link-reauth' | 'link-proof' }>();
  const [confirm, setConfirm] = useState<SocialGrant>(); const [busy, setBusy] = useState(false);
  const googleContainer = useRef<HTMLDivElement>(null); const consumed = useRef(false); const alive = useRef(true);
  const working = useRef(false);
  const current = useRef(client); current.current = client;
  const returnTo = () => window.location.pathname + window.location.search;
  const reload = async () => { const data = await current.current.getSocialAccounts(); if (alive.current) setStatus(data); };
  useEffect(() => { alive.current = true; void reload().catch(() => { if (alive.current) setMessage('로그인 수단을 불러오지 못했습니다. 새로고침해 주세요.'); }); return () => { alive.current = false; }; }, []);
  async function run(operation: () => Promise<void>) {
    if (working.current) return; working.current = true; setBusy(true); setMessage('');
    try { await operation(); }
    catch (error) { if (alive.current) setMessage((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '인증이 만료되었거나 처리하지 못했습니다. 다시 인증해 주세요.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }
  async function complete(kind: 'link-reauth' | 'link-proof', proof: SocialProof) {
    const grant = kind === 'link-reauth' ? await current.current.completeSocialReauthentication(proof) : await current.current.verifySocialLink(proof);
    if (!alive.current) return;
    setChallenge(undefined);
    if (kind === 'link-reauth') { setPermit(grant.token); setMessage('현재 계정을 확인했습니다. 연결할 로그인 수단을 선택해 주세요.'); }
    else { setPermit(undefined); setConfirm(grant); }
  }
  useLayoutEffect(() => {
    if (consumed.current) return; consumed.current = true;
    try {
      const proof = takeSocialCallback(['link-reauth', 'link-proof']);
      if (!proof) return;
      if (proof.cancelled) { setMessage('카카오 인증을 취소했습니다.'); return; }
      void run(() => complete(proof.kind as 'link-reauth' | 'link-proof', proof));
    } catch { setMessage('인증이 만료되었거나 올바르지 않습니다. 다시 인증해 주세요.'); }
  }, []);
  useEffect(() => {
    if (!challenge || !googleContainer.current) return;
    let disposed = false; let cleanup: (() => void) | undefined;
    const container = googleContainer.current;
    void current.current.getGoogleAuthConfig().then(config => {
      if (disposed) return;
      if (!config.enabled || !config.clientId) { setMessage('Google 인증은 준비 중입니다.'); return; }
      return renderGoogleButton({ clientId: config.clientId, nonce: challenge.grant.nonce, container,
        onCredential: idToken => { void run(() => complete(challenge.kind, { token: challenge.grant.token, idToken })); },
        onError: () => { if (!disposed) setMessage('Google 버튼을 불러오지 못했습니다.'); },
      });
    }).then(fn => { if (!fn) return; if (disposed) fn(); else cleanup = fn; }).catch(() => { if (!disposed) setMessage('Google 인증을 준비하지 못했습니다.'); });
    return () => { disposed = true; cleanup?.(); };
  }, [challenge]);
  async function start(provider: SocialProvider, kind: 'link-reauth' | 'link-proof') {
    await run(async () => {
      const grant = kind === 'link-reauth'
        ? await client.startSocialReauthentication(provider, returnTo())
        : await client.startSocialLink(permit!, provider, returnTo());
      setPermit(undefined); setConfirm(undefined);
      if (provider === 'kakao') redirectToKakao(grant, kind);
      else setChallenge({ grant, kind });
    });
  }
  if (!status) return <section aria-label="소셜 계정 연결"><p role="status">{message || '로그인 수단을 확인하고 있습니다…'}</p></section>;
  return <section aria-label="소셜 계정 연결" style={{ display: 'grid', gap: 12, marginTop: 24 }}>
    <h2>로그인 수단 연결</h2>
    <p>연결된 수단: {[...(status.hasPassword ? ['이메일·비밀번호'] : []), ...status.providers.map(p => p === 'google' ? 'Google' : '카카오')].join(', ') || '없음'}</p>
    {!status.canManage ? <p>테스트 계정의 로그인 수단은 변경할 수 없습니다.</p> : <>
      <p>현재 계정으로 다시 인증하고, 연결할 소셜 계정의 인증을 마친 뒤 연결을 확인합니다. 이메일이 같아도 자동으로 합치지 않습니다.</p>
      {!permit && !confirm && !challenge && <>
        {status.hasPassword && <form onSubmit={e => { e.preventDefault(); const input = password; setPassword(''); void run(async () => { const grant = await client.reauthenticateSocialPassword(input); setPermit(grant.token); }); }}>
          <PasswordInput label="현재 비밀번호" autoComplete="current-password" value={password} onChange={setPassword} disabled={busy} />
          <button type="submit" disabled={busy || !password || password.length > 200}>현재 계정 확인</button>
        </form>}
        {status.providers.map(provider => <button key={provider} type="button" disabled={busy || !(provider === 'google' ? status.googleEnabled : status.kakaoEnabled)} onClick={() => void start(provider, 'link-reauth')}>{provider === 'google' ? 'Google' : '카카오'}로 현재 계정 확인</button>)}
      </>}
      {permit && <>{(['google', 'kakao'] as const).filter(p => !status.providers.includes(p)).map(provider => <button key={provider} type="button" disabled={busy || !(provider === 'google' ? status.googleEnabled : status.kakaoEnabled)} onClick={() => void start(provider, 'link-proof')}>{provider === 'google' ? 'Google' : '카카오'} 계정 인증</button>)}</>}
      {challenge && <div ref={googleContainer} aria-label={challenge.kind === 'link-reauth' ? '현재 Google 계정 재인증' : '연결할 Google 계정 인증'} />}
      {confirm && <div><p>인증한 {confirm.provider === 'google' ? 'Google' : '카카오'} 계정을 현재 O4O 계정의 로그인 수단으로 연결하시겠습니까?</p>
        <button type="button" disabled={busy} onClick={() => void run(async () => { await client.confirmSocialLink(confirm.token); setConfirm(undefined); await reload(); setMessage('로그인 수단을 연결했습니다.'); })}>확인하고 연결</button></div>}
      {(permit || challenge || confirm) && <button type="button" disabled={busy} onClick={() => { setPermit(undefined); setChallenge(undefined); setConfirm(undefined); setMessage(''); }}>취소하고 다시 인증</button>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
