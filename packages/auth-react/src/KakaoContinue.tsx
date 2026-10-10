import { SignupTermsAgreement } from './SignupTermsAgreement';
import { styles } from './email/shared';
import type { SignupTermsDocument } from '@o4o/auth-client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { redirectToKakao, takeSocialCallback, type AuthClient, type SocialProof, type KakaoSignupRequest } from '@o4o/auth-client';
import type { AuthLoginResult } from './types';
export interface KakaoContinueProps<TUser = unknown> {
  client: Pick<AuthClient, 'getKakaoAuthConfig' | 'startKakaoLogin' | 'getSignupTerms'>;
  loginWithKakao: (proof: SocialProof) => Promise<AuthLoginResult<TUser>>;
  signupWithKakao: (token: string, input: KakaoSignupRequest) => Promise<AuthLoginResult<TUser>>;
  onSuccess: (user: TUser) => void;
  onError?: (result: AuthLoginResult<TUser>) => void;
  returnTo?: string;
  termsHref?: string; privacyHref?: string;
}
export function KakaoContinue<TUser> (props: KakaoContinueProps<TUser>) {
  const ref = useRef(props); ref.current = props;
  const [configState, setConfigState] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
  const [configAttempt, setConfigAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [policy, setPolicy] = useState<SignupTermsDocument | null>(null);
  const [policyReload, setPolicyReload] = useState(0);
  const [ticket, setTicket] = useState<string>();
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [terms, setTerms] = useState(false); const [privacy, setPrivacy] = useState(false); const [marketing, setMarketing] = useState(false);
  const mounted = useRef(true); const consumed = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setConfigState('loading');
    // A slow or failed public lookup must not silently remove a login method.
    const deadline = setTimeout(() => {
      if (!active) return;
      active = false;
      setConfigState('error');
    }, 10_000);
    void ref.current.client.getKakaoAuthConfig().then(config => {
      if (!active) return;
      if (typeof config?.enabled !== 'boolean') throw new Error('Invalid Kakao configuration response');
      active = false;
      clearTimeout(deadline);
      setConfigState(config.enabled ? 'enabled' : 'disabled');
    }).catch(() => {
      if (!active) return;
      active = false;
      clearTimeout(deadline);
      setConfigState('error');
    });
    return () => { active = false; clearTimeout(deadline); };
  }, [configAttempt]);
  const finish = useCallback((result: AuthLoginResult<TUser>) => {
    if (!mounted.current) return;
    setBusy(false);
    if (result.success && result.user) { ref.current.onSuccess(result.user); return; }
    if (result.nextStep === 'signup' && result.signupTicket) { setTicket(result.signupTicket); setEmail(result.email ?? ''); return; }
    if (result.nextStep === 'verify-email') { setTicket(undefined); setMessage(result.mailSent ? '확인 메일을 보냈습니다. 이메일을 확인한 뒤 카카오로 다시 로그인해 주세요.' : '확인 메일을 보내지 못했습니다. 잠시 후 카카오로 다시 로그인해 주세요.'); return; }
    if (result.code?.startsWith('POLICY_')) { setPolicy(null); setTerms(false); setPolicyReload(value => value + 1); }
    setMessage(result.error ?? '인증을 다시 시작해 주세요.'); ref.current.onError?.(result);
  }, []);
  useLayoutEffect(() => {
    if (consumed.current) return; consumed.current = true;
    try {
      const callback = takeSocialCallback(['kakao-login']);
      if (!callback) return;
      if (callback.cancelled) { setMessage('카카오 인증을 취소했습니다.'); return; }
      setBusy(true); void ref.current.loginWithKakao(callback).then(finish);
    } catch { setMessage('카카오 인증이 만료되었거나 올바르지 않습니다. 다시 시작해 주세요.'); }
  }, [finish]);
  async function start() {
    setMessage(''); setBusy(true);
    try { redirectToKakao(await ref.current.client.startKakaoLogin(ref.current.returnTo ?? '/'), 'kakao-login'); }
    catch { setBusy(false); setMessage('카카오 인증을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  }
  return <div data-testid="kakao-continue" style={{ display: 'grid', gap: 10 }}>
    {configState === 'loading' && !ticket && <p role="status">카카오 로그인을 불러오고 있습니다…</p>}
    {configState === 'error' && !ticket && <>
      <p role="alert">카카오 로그인을 불러오지 못했습니다. 다시 시도해 주세요.</p>
      <button type="button" disabled={busy} onClick={() => setConfigAttempt(attempt => attempt + 1)}>카카오 로그인 다시 불러오기</button>
    </>}
    {configState === 'enabled' && !ticket && <button type="button" disabled={busy} style={{ background: '#fee500', color: '#191919', minHeight: 44, border: 0, borderRadius: 6 }} onClick={() => void start()}>카카오로 계속하기</button>}
    {busy && <p role="status">카카오 계정을 확인하고 있습니다…</p>}
    {ticket && <form onSubmit={e => { e.preventDefault(); if (busy || !policy || !terms || !privacy) return; setBusy(true); void ref.current.signupWithKakao(ticket, { email, name, phone, consents: { terms, privacy, marketing, termsPolicy: { policyDocumentId: policy.policyDocumentId, version: policy.version } } }).then(finish).catch(() => { if (mounted.current) { setBusy(false); setMessage('가입을 처리하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.'); } }); }} style={{ display: 'grid', gap: 10 }}>
      <p>계정을 만들려면 정보를 입력하고 약관에 동의해 주세요.</p>
      <label style={styles.field}>이메일<input style={styles.input} type="email" autoComplete="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label style={styles.field}>이름<input style={styles.input} autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label style={styles.field}>개인 휴대전화<input style={styles.input} type="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></label>
      <p>휴대전화 본인 인증은 수행하지 않습니다. 이메일 소유 확인이 필요하면 확인 메일을 보냅니다.</p>
      <SignupTermsAgreement load={() => ref.current.client.getSignupTerms()} checked={terms} onChecked={setTerms} onDocument={setPolicy} reloadKey={policyReload} />
      <div style={styles.checkRow}><label style={styles.checkRow}><input type="checkbox" required checked={privacy} onChange={e => setPrivacy(e.target.checked)} />개인정보 처리방침 동의 (필수)</label><a style={styles.link} href={props.privacyHref ?? 'https://neture.co.kr/privacy'} target="_blank" rel="noreferrer">내용 보기</a></div>
      <label><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />마케팅 정보 수신 동의 (선택)</label>
      <button type="submit" style={styles.primaryBtn} disabled={busy || !policy || !terms || !privacy}>동의하고 계정 만들기</button>
      <button type="button" style={styles.ghostBtn} disabled={busy} onClick={() => { setTicket(undefined); setMessage(''); }}>취소</button>
    </form>}
    {message && <p role="alert">{message}</p>}
  </div>;
}
