/**
 * <LoginMethods /> — 서비스 로그인 화면 공통 조립: 이메일 로그인 → "또는" → Google 로 계속하기
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1
 *
 * 이메일 계정은 플랫폼 계정이라 어느 서비스 호스트에서든 같은 수단으로 로그인한다(세션 서비스는 서버가 Origin 으로 정한다).
 * 계정 만들기 · 아이디 찾기 · 비밀번호 찾기는 계정 센터(Neture) 정식 화면으로 연결한다 — 서비스별 복제 금지.
 * 오류 표시는 각 폼이 한다. 호출부는 `onGoogleError` · `onEmailFailure` 로 서비스 고유 안내(예: SERVICE_NOT_MEMBER)만 더한다.
 */
import type { CSSProperties, ReactNode } from 'react';
import { GoogleContinue, type GoogleContinueProps } from './GoogleContinue';
import { DemoLoginButtons } from './DemoLoginButtons';
import { EmailLoginForm } from './email/EmailLoginForm';
import type { EmailAuthApi, EmailAuthLinks } from './email/shared';
import type { AuthLoginResult } from './types';

/** 계정 센터(Neture) 정식 화면. 이메일 확인 · 재설정 메일 링크도 같은 origin 으로 간다(서버 resolveMailLinkOrigin). */
export const O4O_ACCOUNT_LINKS: Readonly<EmailAuthLinks> = Object.freeze({
  signup: 'https://neture.co.kr/signup',
  findId: 'https://neture.co.kr/find-id',
  forgotPassword: 'https://neture.co.kr/forgot-password',
});

export const DEFAULT_GOOGLE_HINT = 'Google 로 처음이신가요? 같은 Google 버튼으로 약관 동의 후 계정이 만들어집니다.';

export interface LoginMethodsProps<TUser = unknown> {
  /** `useServiceAuth().loginWithEmail` */
  loginWithEmail: (email: string, password: string) => Promise<AuthLoginResult<TUser>>;
  /** 확인 메일 재발송(`authClient`). */
  api: Pick<EmailAuthApi, 'resendVerificationEmail'>;
  /** Google 버튼 설정 — `onSuccess` 는 아래 공통 `onSuccess` 를 쓴다. `hint` 미지정이면 기본 안내. */
  google: Omit<GoogleContinueProps<TUser>, 'onSuccess' | 'className'>;
  /** 이메일 · Google 어느 쪽이든 세션이 성립하면 호출. */
  onSuccess: (user: TUser) => void;
  /** 이메일 로그인 실패 result — 서비스 고유 안내용(선택). */
  onEmailFailure?: (result: AuthLoginResult<TUser>) => void;
  /** 기본값 O4O_ACCOUNT_LINKS. 같은 앱 안의 화면이면 `onNavigate` 로 SPA 이동. */
  accountLinks?: EmailAuthLinks;
  className?: string;
}

const box: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const divider: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#9ca3af' };
const rule: CSSProperties = { flex: 1, height: 1, background: '#e5e7eb' };
const hintStyle: CSSProperties = { fontSize: 12, color: '#6b7280', textAlign: 'center', margin: 0 };

export function LoginMethods<TUser = unknown>({
  loginWithEmail,
  api,
  google,
  onSuccess,
  onEmailFailure,
  accountLinks = O4O_ACCOUNT_LINKS,
  className,
}: LoginMethodsProps<TUser>) {
  const hint: ReactNode = google.hint ?? <p style={hintStyle}>{DEFAULT_GOOGLE_HINT}</p>;
  return (
    <div className={className} style={box} data-testid="login-methods">
      <EmailLoginForm<TUser>
        onLogin={loginWithEmail}
        api={api}
        links={accountLinks}
        onSuccess={(result) => { if (result.user) onSuccess(result.user); }}
        onFailure={onEmailFailure}
      />
      <div style={divider} aria-hidden>
        <span style={rule} />또는<span style={rule} />
      </div>
      <GoogleContinue<TUser> {...google} hint={hint} onSuccess={({ user }) => onSuccess(user)} />
      <DemoLoginButtons loginWithEmail={loginWithEmail} onSuccess={onSuccess} onFailure={onEmailFailure} />
    </div>
  );
}
