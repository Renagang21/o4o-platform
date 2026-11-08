import { signupPrivacyHref, SignupTermsAgreement, signupPolicyReferences } from './SignupTermsAgreement';
import { styles } from './email/shared';
import type { SignupTermsDocument } from '@o4o/auth-client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { redirectToKakao, takeSocialCallback, type AuthClient, type SocialProof, type KakaoSignupRequest } from '@o4o/auth-client';
import type { AuthLoginResult } from './types';
import { useAlertIntoView } from './useAlertIntoView';
/** WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T1: 가입 실패 코드별 안내. 같은 이메일의 다른 수단 가입은 서버가 막는다. */
export const KAKAO_SIGNUP_EMAIL_IN_USE_MESSAGE =
  '이미 가입된 이메일입니다. 기존 방법으로 로그인한 뒤 계정 설정에서 카카오를 연결해 주시기 바랍니다.';
export const KAKAO_SIGNUP_EXPIRED_MESSAGE = '가입 확인 시간이 지났습니다. 카카오로 다시 시작해 주시기 바랍니다.';
const KAKAO_SIGNUP_CONFLICT_CODES = new Set(['EMAIL_IN_USE', 'SOCIAL_IDENTITY_CONFLICT']);
export interface KakaoContinueProps<TUser = unknown> {
  client: Pick<AuthClient, 'getKakaoAuthConfig' | 'startKakaoLogin' | 'getSignupTerms'>;
  loginWithKakao: (proof: SocialProof) => Promise<AuthLoginResult<TUser>>;
  signupWithKakao: (token: string, input: KakaoSignupRequest) => Promise<AuthLoginResult<TUser>>;
  onSuccess: (user: TUser) => void;
  onError?: (result: AuthLoginResult<TUser>) => void;
  returnTo?: string;
  intent?: 'login' | 'signup';
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
  const ticketRef = useRef<string | undefined>(undefined); ticketRef.current = ticket;
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [nickname, setNickname] = useState('');
  const [terms, setTerms] = useState(false); const [privacy, setPrivacy] = useState(false); const [marketing, setMarketing] = useState(false);
  const mounted = useRef(true); const consumed = useRef(false);
  const alertRef = useAlertIntoView<HTMLParagraphElement>(message);
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
    if (result.nextStep === 'verify-email') { setTicket(undefined); setMessage(result.mailSent ? '확인 메일을 보냈습니다. 이메일을 확인한 뒤 카카오로 다시 로그인해 주시기 바랍니다.' : '확인 메일을 보내지 못했습니다. 잠시 후 카카오로 다시 로그인해 주시기 바랍니다.'); return; }
    if (result.code?.startsWith('POLICY_')) { setPolicy(null); setTerms(false); setPrivacy(false); setPolicyReload(value => value + 1); }
    // T1: 만료 · 무효 가입 티켓은 다시 눌러도 계속 실패한다 — 폼을 닫고 카카오 시작 버튼으로 돌린다.
    if (result.code === 'SOCIAL_FLOW_INVALID' || (result.status === 401 && ticketRef.current)) {
      setTicket(undefined); setMessage(KAKAO_SIGNUP_EXPIRED_MESSAGE); ref.current.onError?.(result); return;
    }
    if (result.code && KAKAO_SIGNUP_CONFLICT_CODES.has(result.code)) { setMessage(KAKAO_SIGNUP_EMAIL_IN_USE_MESSAGE); ref.current.onError?.(result); return; }
    setMessage(result.error ?? '인증을 다시 시작해 주시기 바랍니다.'); ref.current.onError?.(result);
  }, []);
  useLayoutEffect(() => {
    if (consumed.current) return; consumed.current = true;
    try {
      const callback = takeSocialCallback(['kakao-login']);
      if (!callback) return;
      if (callback.cancelled) { setMessage('카카오 인증을 취소했습니다.'); return; }
      setBusy(true); void ref.current.loginWithKakao(callback).then(finish);
    } catch { setMessage('카카오 인증이 만료되었거나 올바르지 않습니다. 다시 시작해 주시기 바랍니다.'); }
  }, [finish]);
  async function start() {
    setMessage(''); setBusy(true);
    try { redirectToKakao(await ref.current.client.startKakaoLogin(ref.current.returnTo ?? '/'), 'kakao-login'); }
    catch { setBusy(false); setMessage('카카오 인증을 시작하지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.'); }
  }
  return <div data-testid="kakao-continue" style={{ display: 'grid', gap: 10 }}>
    {configState === 'loading' && !ticket && <p role="status">카카오 로그인을 불러오고 있습니다…</p>}
    {configState === 'error' && !ticket && <>
      <p role="alert">카카오 로그인을 불러오지 못했습니다. 다시 시도해 주시기 바랍니다.</p>
      <button type="button" disabled={busy} onClick={() => setConfigAttempt(attempt => attempt + 1)}>카카오 로그인 다시 불러오기</button>
    </>}
    {configState === 'enabled' && !ticket && <button type="button" disabled={busy} style={{ background: '#fee500', color: '#191919', minHeight: props.intent === 'signup' ? 32 : 44, ...(props.intent === 'signup' ? { height: 32, paddingBlock: 0, boxSizing: 'border-box' as const } : {}), border: 0, borderRadius: 6 }} onClick={() => void start()}>{props.intent === 'signup' ? '카카오로 가입' : '카카오로 계속하기'}</button>}
    {busy && <p role="status">카카오 계정을 확인하고 있습니다…</p>}
    {ticket && <form onSubmit={e => { e.preventDefault(); if (busy || !policy || !terms || !privacy) return; setBusy(true); setMessage(''); void ref.current.signupWithKakao(ticket, { email, ...(name.trim() ? { name: name.trim() } : {}), nickname: nickname.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}), consents: { terms, privacy, marketing, ...signupPolicyReferences(policy!) } }).then(finish).catch((error: any) => { if (mounted.current) { setBusy(false); if (['POLICY_VERSION_MISMATCH', 'POLICY_UNAVAILABLE'].includes(error?.response?.data?.code ?? error?.response?.data?.error?.code)) { setPolicy(null); setTerms(false); setPrivacy(false); setPolicyReload(n => n + 1); setMessage('정책이 변경되었습니다. 입력 내용은 유지됩니다. 최신 내용을 확인해 주시기 바랍니다.'); } else setMessage('가입을 처리하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주시기 바랍니다.'); } }); }} style={{ display: 'grid', gap: 10 }}>
      <p>계정을 만들려면 정보를 입력하고 약관에 동의해 주시기 바랍니다.</p>
      <label style={styles.field}>이메일<input style={styles.input} type="email" autoComplete="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label style={styles.field}>닉네임<input style={styles.input} required maxLength={50} value={nickname} onChange={e => setNickname(e.target.value)} /></label>
      <label style={styles.field}>이름 (선택)<input style={styles.input} autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label style={styles.field}>개인 휴대전화 (선택)<input style={styles.input} type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></label>
      <p>휴대전화 본인 인증은 수행하지 않습니다. 이메일 소유 확인이 필요하면 확인 메일을 보냅니다.</p>
      <SignupTermsAgreement load={() => ref.current.client.getSignupTerms()} checked={terms} onChecked={setTerms} onDocument={document => { setPolicy(document); setPrivacy(false); }} reloadKey={policyReload} />
      <div style={styles.checkRow}><label style={styles.checkRow}><input type="checkbox" required checked={privacy} onChange={e => setPrivacy(e.target.checked)} />개인정보 처리방침 동의 (필수)</label>{policy && <a style={styles.link} href={signupPrivacyHref(policy)} target="_blank" rel="noreferrer">내용 보기</a>}</div>
      <label><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />마케팅 정보 수신 동의 (선택)</label>
      {/* T1: 오류는 제출 버튼 바로 위에 — 스크롤되는 모달 하단에 숨지 않게 한다. */}
      {message && <p ref={alertRef} role="alert" data-testid="kakao-signup-error">{message}</p>}
      <button type="submit" style={styles.primaryBtn} disabled={busy || !policy || !terms || !privacy}>동의하고 계정 만들기</button>
      <button type="button" style={styles.ghostBtn} disabled={busy} onClick={() => { setTicket(undefined); setMessage(''); }}>취소</button>
    </form>}
    {message && !ticket && <p ref={alertRef} role="alert">{message}</p>}
  </div>;
}
