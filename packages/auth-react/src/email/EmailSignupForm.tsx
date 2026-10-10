import { SignupTermsAgreement } from '../SignupTermsAgreement';
import type { SignupTermsDocument } from '@o4o/auth-client';
/**
 * <EmailSignupForm /> — 이메일 회원가입 + <EmailSentNotice /> 확인 메일 안내
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 * 입력: 이메일(=로그인 아이디) · 이름 · 휴대전화 · 비밀번호 · 비밀번호 확인 · 필수 약관.
 * 휴대전화는 아이디 찾기에만 쓴다(본인 인증이 아니다).
 * 가입은 계정만 만든다 — 서비스 가입 · 조직 · 역할을 주지 않고 세션도 열지 않는다(메일 확인 후 로그인).
 * 이미 쓰는 이메일은 서버가 안내 문구를 준다(새 계정 · 자동 병합 없음).
 */
import { useState, type FormEvent } from 'react';
import { checkPasswordPolicy, isLoginEmailShapeValid } from '@o4o/auth-utils';
import { PasswordInput } from './PasswordInput';
import { PasswordPolicyHints } from './PasswordPolicyHints';
import { linkHandler, readEmailAuthError, styles, type EmailAuthApi, type EmailAuthLinks } from './shared';

export interface EmailSignupFormProps {
  api: Pick<EmailAuthApi, 'signupWithEmail' | 'resendVerificationEmail' | 'getSignupTerms'>;
  links?: EmailAuthLinks;
  termsHref: string;
  privacyHref: string;
  className?: string;
}

const PHONE_SHAPE = /^01\d{8,9}$/;

export function EmailSignupForm({ api, links, privacyHref, className }: EmailSignupFormProps) {
  const [policy, setPolicy] = useState<SignupTermsDocument | null>(null);
  const [policyReload, setPolicyReload] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ email: string; masked?: string; mailSent?: boolean } | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');
  const emailOk = isLoginEmailShapeValid(email);
  const phoneOk = PHONE_SHAPE.test(phoneDigits);
  const policyOk = checkPasswordPolicy(password).length === 0;
  const confirmOk = confirm.length > 0 && confirm === password;
  const ready = !!policy && emailOk && name.trim().length > 0 && phoneOk && policyOk && confirmOk && terms && privacy && !submitting;

  if (sentTo) {
    return (
      <EmailSentNotice
        api={api}
        email={sentTo.email}
        maskedEmail={sentTo.masked}
        mailSent={sentTo.mailSent}
        links={links}
        className={className}
      />
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.signupWithEmail({
        email: email.trim(),
        name: name.trim(),
        phone: phoneDigits,
        password,
        consents: { terms, privacy, marketing, termsPolicy: { policyDocumentId: policy!.policyDocumentId, version: policy!.version } },
      });
      setPassword('');
      setConfirm('');
      setSentTo({ email: email.trim(), masked: res.maskedEmail ?? undefined, mailSent: res.mailSent });
    } catch (e) {
      const failure = readEmailAuthError(e, '회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      if (failure.code?.startsWith('POLICY_')) { setPolicy(null); setTerms(false); setPolicyReload(value => value + 1); }
      setError(failure.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.box} className={className} noValidate data-testid="email-signup-form">
      <div style={styles.field}>
        <label htmlFor="o4o-signup-email" style={styles.label}>이메일 (로그인 아이디)</label>
        <input
          id="o4o-signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={email.length > 0 && !emailOk ? true : undefined}
          style={{ ...styles.input, ...(email.length > 0 && !emailOk ? styles.inputInvalid : null) }}
          placeholder="name@example.com"
        />
        {email.length > 0 && !emailOk && <p style={styles.hintBad}>올바른 이메일 주소를 입력해 주세요.</p>}
      </div>
      <div style={styles.field}>
        <label htmlFor="o4o-signup-name" style={styles.label}>이름</label>
        <input
          id="o4o-signup-name"
          type="text"
          autoComplete="name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.field}>
        <label htmlFor="o4o-signup-phone" style={styles.label}>휴대전화</label>
        <input
          id="o4o-signup-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={phone.length > 0 && !phoneOk ? true : undefined}
          style={{ ...styles.input, ...(phone.length > 0 && !phoneOk ? styles.inputInvalid : null) }}
          placeholder="01012345678"
        />
        <p style={phone.length > 0 && !phoneOk ? styles.hintBad : styles.hint}>
          {phone.length > 0 && !phoneOk
            ? '휴대전화 번호를 확인해 주세요. (예: 01012345678)'
            : '아이디(이메일)를 잊었을 때 찾는 용도로만 씁니다. 본인 인증은 하지 않습니다.'}
        </p>
      </div>
      <PasswordInput
        label="비밀번호"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        invalid={password.length > 0 && !policyOk}
        describedBy="o4o-signup-password-hints"
        testId="email-signup-password"
      />
      <PasswordInput
        label="비밀번호 확인"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        invalid={confirm.length > 0 && !confirmOk}
        describedBy="o4o-signup-password-hints"
        testId="email-signup-confirm"
      />
      <PasswordPolicyHints id="o4o-signup-password-hints" password={password} confirm={confirm} />

      <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <legend style={{ ...styles.label, marginBottom: 4 }}>약관 동의</legend>
        <SignupTermsAgreement load={() => api.getSignupTerms!()} checked={terms} onChecked={setTerms} onDocument={setPolicy} reloadKey={policyReload} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <label style={styles.checkRow}><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /><span>개인정보 처리방침 동의 (필수)</span></label>
          <a href={privacyHref} target="_blank" rel="noopener noreferrer" style={styles.link}>개인정보 처리방침 내용 보기</a>
        </div>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span>(선택) 마케팅 정보 수신에 동의합니다</span>
        </label>
      </fieldset>

      {error && <p role="alert" style={styles.error}>{error}</p>}
      <button type="submit" disabled={!ready} style={{ ...styles.primaryBtn, opacity: ready ? 1 : 0.6 }}>
        {submitting ? '가입 처리 중…' : '가입하고 확인 메일 받기'}
      </button>
      {links?.login && (
        <p style={styles.muted}>
          이미 계정이 있으신가요?{' '}
          <a href={links.login} onClick={linkHandler(links, links.login)} style={styles.link}>로그인</a>
        </p>
      )}
    </form>
  );
}

export interface EmailSentNoticeProps {
  api: Pick<EmailAuthApi, 'resendVerificationEmail'>;
  email: string;
  maskedEmail?: string;
  mailSent?: boolean;
  links?: EmailAuthLinks;
  className?: string;
}

/** 확인 메일 발송 안내 — 재발송 · 로그인으로 이동. */
export function EmailSentNotice({ api, email, maskedEmail, mailSent, links, className }: EmailSentNoticeProps) {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await api.resendVerificationEmail(email);
      setMessage(res.message ?? '확인 메일을 다시 보냈습니다.');
    } catch (e) {
      setError(readEmailAuthError(e, '확인 메일을 보내지 못했습니다.').message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.box} className={className} data-testid="email-sent-notice">
      <p role="status" style={styles.notice}>
        <strong>{maskedEmail ?? email}</strong> 으로 확인 메일을 보냈습니다.
        <br />
        메일의 링크를 열면 가입이 완료되고, 그다음 이메일과 비밀번호로 로그인할 수 있습니다. 링크는 24시간 동안 유효합니다.
      </p>
      {mailSent === false && (
        <p style={styles.error}>메일 발송이 지연되고 있습니다. 잠시 후 아래 버튼으로 다시 보내 주세요.</p>
      )}
      <p style={styles.hint}>메일이 보이지 않으면 스팸함을 확인해 주세요.</p>
      {message && <p role="status" style={styles.hintOk}>{message}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      <button type="button" onClick={handleResend} disabled={resending} style={styles.ghostBtn}>
        {resending ? '보내는 중…' : '확인 메일 다시 보내기'}
      </button>
      {links?.login && (
        <a href={links.login} onClick={linkHandler(links, links.login)} style={{ ...styles.primaryBtn, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', display: 'block' }}>
          로그인하러 가기
        </a>
      )}
    </div>
  );
}
