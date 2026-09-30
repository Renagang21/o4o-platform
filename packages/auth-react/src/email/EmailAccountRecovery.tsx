/**
 * 이메일 확인 · 비밀번호 찾기/재설정 · 아이디 찾기 화면
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 * - <VerifyEmailView />      메일 링크 토큰으로 주소 확인(자동 로그인 없음 → 로그인 안내)
 * - <ForgotPasswordForm />   재설정 메일 요청(계정 존재 여부와 무관하게 같은 안내)
 * - <ResetPasswordForm />    새 비밀번호 + 확인. 성공하면 모든 기기 로그아웃 → 다시 로그인
 * - <FindLoginIdForm />      이름 + 휴대전화 → 가린 이메일 힌트(정확히 한 계정일 때만)
 *
 * 토큰은 1회용이다. React StrictMode 의 이중 effect 로 두 번 제출하지 않도록 토큰별로 한 번만 보낸다.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { checkPasswordPolicy, isLoginEmailShapeValid } from '@o4o/auth-utils';
import { PasswordInput } from './PasswordInput';
import { PasswordPolicyHints } from './PasswordPolicyHints';
import { linkHandler, readEmailAuthError, styles, type EmailAuthApi, type EmailAuthLinks } from './shared';
import type { EmailAuthNotice } from '@o4o/auth-client';

function LoginLink({ links, label = '로그인하러 가기' }: { links?: EmailAuthLinks; label?: string }) {
  if (!links?.login) return null;
  return (
    <a
      href={links.login}
      onClick={linkHandler(links, links.login)}
      style={{ ...styles.primaryBtn, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', display: 'block' }}
    >
      {label}
    </a>
  );
}

// ─── 이메일 확인 ────────────────────────────────────────────────────────────

export interface VerifyEmailViewProps {
  api: Pick<EmailAuthApi, 'verifyEmail'>;
  /** URL 의 token. 없으면 안내만 보인다. */
  token: string | null;
  links?: EmailAuthLinks;
  className?: string;
}

export function VerifyEmailView({ api, token, links, className }: VerifyEmailViewProps) {
  const [state, setState] = useState<'pending' | 'done' | 'failed'>(token ? 'pending' : 'failed');
  const [message, setMessage] = useState<string>(token ? '이메일을 확인하는 중입니다…' : '확인 링크가 올바르지 않습니다.');
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (!token || sentFor.current === token) return;
    sentFor.current = token;
    api
      .verifyEmail(token)
      .then((res) => {
        setState('done');
        setMessage(res.message ?? '이메일 확인이 완료되었습니다. 이제 로그인할 수 있습니다.');
      })
      .catch((e) => {
        setState('failed');
        setMessage(readEmailAuthError(e, '이메일을 확인하지 못했습니다.').message);
      });
  }, [api, token]);

  return (
    <div style={styles.box} className={className} data-testid="verify-email-view">
      <p role={state === 'failed' ? 'alert' : 'status'} style={state === 'failed' ? styles.error : styles.notice}>
        {message}
      </p>
      {state === 'failed' && (
        <p style={styles.hint}>
          링크가 만료되었거나 이미 사용되었을 수 있습니다. 로그인 화면에서 이메일과 비밀번호를 입력하면 확인 메일을 다시 받을 수 있습니다.
        </p>
      )}
      {state !== 'pending' && <LoginLink links={links} />}
    </div>
  );
}

// ─── 비밀번호 찾기 ──────────────────────────────────────────────────────────

export interface ForgotPasswordFormProps {
  api: Pick<EmailAuthApi, 'requestPasswordReset'>;
  links?: EmailAuthLinks;
  className?: string;
}

export function ForgotPasswordForm({ api, links, className }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ok = isLoginEmailShapeValid(email);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ok || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.requestPasswordReset(email.trim());
      setNotice(res.message ?? '가입된 이메일이면 비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.');
    } catch (e) {
      setError(readEmailAuthError(e, '요청을 처리하지 못했습니다.').message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.box} className={className} noValidate data-testid="forgot-password-form">
      <p style={styles.hint}>
        가입한 이메일(로그인 아이디)을 입력하면 비밀번호 재설정 링크를 보냅니다. 링크는 30분 동안 유효합니다.
        Google 로 가입한 계정도 여기서 비밀번호를 만들 수 있습니다.
      </p>
      <div style={styles.field}>
        <label htmlFor="o4o-forgot-email" style={styles.label}>이메일</label>
        <input
          id="o4o-forgot-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          placeholder="name@example.com"
        />
      </div>
      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      <button type="submit" disabled={!ok || submitting} style={{ ...styles.primaryBtn, opacity: ok && !submitting ? 1 : 0.6 }}>
        {submitting ? '보내는 중…' : notice ? '다시 보내기' : '재설정 메일 받기'}
      </button>
      <nav style={styles.linkRow}>
        {links?.login && <a href={links.login} onClick={linkHandler(links, links.login)} style={styles.link}>로그인</a>}
        {links?.login && links?.findId && <span aria-hidden>·</span>}
        {links?.findId && <a href={links.findId} onClick={linkHandler(links, links.findId)} style={styles.link}>아이디 찾기</a>}
      </nav>
    </form>
  );
}

// ─── 비밀번호 재설정 ────────────────────────────────────────────────────────

export interface ResetPasswordFormProps {
  api: Pick<EmailAuthApi, 'resetPassword'>;
  token: string | null;
  links?: EmailAuthLinks;
  className?: string;
}

export function ResetPasswordForm({ api, token, links, className }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div style={styles.box} className={className}>
        <p role="alert" style={styles.error}>재설정 링크가 올바르지 않습니다. 비밀번호 찾기를 다시 진행해 주세요.</p>
        {links?.forgotPassword && (
          <a href={links.forgotPassword} onClick={linkHandler(links, links.forgotPassword)} style={styles.link}>비밀번호 찾기</a>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div style={styles.box} className={className} data-testid="reset-password-done">
        <p role="status" style={styles.notice}>{done}</p>
        <LoginLink links={links} label="새 비밀번호로 로그인" />
      </div>
    );
  }

  const policyOk = checkPasswordPolicy(password).length === 0;
  const confirmOk = confirm.length > 0 && confirm === password;
  const ready = policyOk && confirmOk && !submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.resetPassword(token, password);
      setPassword('');
      setConfirm('');
      setDone(res.message ?? '비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인해 주세요.');
    } catch (e) {
      setError(readEmailAuthError(e, '비밀번호를 바꾸지 못했습니다.').message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.box} className={className} noValidate data-testid="reset-password-form">
      <PasswordInput
        label="새 비밀번호"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        invalid={password.length > 0 && !policyOk}
        describedBy="o4o-reset-password-hints"
        testId="reset-password-new"
      />
      <PasswordInput
        label="새 비밀번호 확인"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        invalid={confirm.length > 0 && !confirmOk}
        describedBy="o4o-reset-password-hints"
        testId="reset-password-confirm"
      />
      <PasswordPolicyHints id="o4o-reset-password-hints" password={password} confirm={confirm} />
      <p style={styles.hint}>비밀번호를 바꾸면 모든 기기에서 로그아웃됩니다.</p>
      {error && <p role="alert" style={styles.error}>{error}</p>}
      <button type="submit" disabled={!ready} style={{ ...styles.primaryBtn, opacity: ready ? 1 : 0.6 }}>
        {submitting ? '저장 중…' : '비밀번호 바꾸기'}
      </button>
    </form>
  );
}

// ─── 아이디 찾기 ────────────────────────────────────────────────────────────

export interface FindLoginIdFormProps {
  api: Pick<EmailAuthApi, 'findLoginId'>;
  links?: EmailAuthLinks;
  className?: string;
}

export function FindLoginIdForm({ api, links, className }: FindLoginIdFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EmailAuthNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const digits = phone.replace(/\D/g, '');
  const ready = name.trim().length > 0 && /^01\d{8,9}$/.test(digits) && !submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      setResult(await api.findLoginId(name.trim(), digits));
    } catch (e) {
      setError(readEmailAuthError(e, '아이디 찾기를 처리하지 못했습니다.').message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.box} className={className} noValidate data-testid="find-login-id-form">
      <p style={styles.hint}>
        이메일로 가입할 때 입력한 이름과 휴대전화 번호로 로그인 아이디(이메일)를 찾습니다. Google 로 가입했다면 Google 로 로그인해 주세요.
      </p>
      <div style={styles.field}>
        <label htmlFor="o4o-findid-name" style={styles.label}>이름</label>
        <input id="o4o-findid-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
      </div>
      <div style={styles.field}>
        <label htmlFor="o4o-findid-phone" style={styles.label}>휴대전화</label>
        <input
          id="o4o-findid-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={styles.input}
          placeholder="01012345678"
        />
      </div>
      {result && (
        <div role="status" style={styles.notice} data-testid="find-login-id-result">
          {result.found && result.maskedEmail && (
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{result.maskedEmail}</p>
          )}
          <p style={{ margin: 0 }}>{result.message}</p>
        </div>
      )}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      <button type="submit" disabled={!ready} style={{ ...styles.primaryBtn, opacity: ready ? 1 : 0.6 }}>
        {submitting ? '찾는 중…' : '아이디 찾기'}
      </button>
      <nav style={styles.linkRow}>
        {links?.login && <a href={links.login} onClick={linkHandler(links, links.login)} style={styles.link}>로그인</a>}
        {links?.login && links?.forgotPassword && <span aria-hidden>·</span>}
        {links?.forgotPassword && (
          <a href={links.forgotPassword} onClick={linkHandler(links, links.forgotPassword)} style={styles.link}>비밀번호 찾기</a>
        )}
      </nav>
    </form>
  );
}
