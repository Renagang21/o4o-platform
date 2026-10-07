/**
 * <EmailLoginForm /> — 이메일(로그인 ID) + 비밀번호 로그인
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 * 로그인 실행은 주입(`onLogin` = useServiceAuth().loginWithEmail)이다 — 세션 채택 로직을 여기 두지 않는다.
 * 인증 전 이메일(`EMAIL_NOT_VERIFIED`)이면 확인 메일 재발송 버튼을 보인다.
 * 아래 링크: 회원가입 · 아이디 찾기 · 비밀번호 찾기.
 */
import { useState, type FormEvent } from 'react';
import type { AuthLoginResult } from '../types';
import { PasswordInput } from './PasswordInput';
import { linkHandler, readEmailAuthError, styles, type EmailAuthApi, type EmailAuthLinks } from './shared';

export interface EmailLoginFormProps<TUser> {
  onLogin: (email: string, password: string) => Promise<AuthLoginResult<TUser>>;
  /** 로그인 성공 후 처리(모달 닫기 · 이동 등). */
  onSuccess?: (result: AuthLoginResult<TUser>) => void;
  /** 실패 result 를 서비스가 추가로 다룰 때(예: SERVICE_NOT_MEMBER 안내). */
  onFailure?: (result: AuthLoginResult<TUser>) => void;
  /** 확인 메일 재발송에 쓴다. */
  api: Pick<EmailAuthApi, 'resendVerificationEmail'>;
  links?: EmailAuthLinks;
  className?: string;
}

export function EmailLoginForm<TUser>({ onLogin, onSuccess, onFailure, api, links, className }: EmailLoginFormProps<TUser>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setNeedsVerify(false);
    const result = await onLogin(email.trim(), password);
    setSubmitting(false);
    if (result.success) {
      setPassword('');
      onSuccess?.(result);
      return;
    }
    setError(result.error ?? '로그인에 실패했습니다.');
    setNeedsVerify(result.code === 'EMAIL_NOT_VERIFIED');
    onFailure?.(result);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await api.resendVerificationEmail(email.trim());
      setNotice(res.message ?? '확인 메일을 다시 보냈습니다. 메일함을 확인해 주세요.');
      setError(null);
    } catch (e) {
      setError(readEmailAuthError(e, '확인 메일을 보내지 못했습니다.').message);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.box} className={className} noValidate data-testid="email-login-form">
      <div style={styles.field}>
        <label htmlFor="o4o-email-login-email" style={styles.label}>이메일</label>
        <input
          id="o4o-email-login-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          style={styles.input}
          placeholder="name@example.com"
        />
      </div>
      <PasswordInput
        label="비밀번호"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        disabled={submitting}
        testId="email-login-password"
      />
      {error && <p role="alert" style={styles.error}>{error}</p>}
      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      {needsVerify && (
        <button type="button" onClick={handleResend} disabled={resending} style={styles.ghostBtn}>
          {resending ? '보내는 중…' : '확인 메일 다시 보내기'}
        </button>
      )}
      <button type="submit" disabled={!canSubmit} style={{ ...styles.primaryBtn, opacity: canSubmit ? 1 : 0.6 }}>
        {submitting ? '로그인 중…' : '로그인'}
      </button>
      <nav style={styles.linkRow} aria-label="계정 도움말">
        {links?.signup && <a href={links.signup} onClick={linkHandler(links, links.signup)} style={styles.link}>회원가입</a>}
        {links?.signup && links?.findId && <span aria-hidden>·</span>}
        {links?.findId && <a href={links.findId} onClick={linkHandler(links, links.findId)} style={styles.link}>아이디 찾기</a>}
        {links?.findId && links?.forgotPassword && <span aria-hidden>·</span>}
        {links?.forgotPassword && (
          <a href={links.forgotPassword} onClick={linkHandler(links, links.forgotPassword)} style={styles.link}>비밀번호 찾기</a>
        )}
      </nav>
    </form>
  );
}
