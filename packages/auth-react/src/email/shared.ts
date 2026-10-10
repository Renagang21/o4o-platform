/**
 * 이메일·비밀번호 인증 UI 공통 — 스타일 · 오류 해석 · 링크
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 * GoogleContinue 와 같은 방식이다: inline 최소 스타일(서비스 Tailwind 와 충돌하지 않게 className 으로 덮는다),
 * 서비스명 조건문 없음. 서버 오류 문구는 서버가 한국어로 확정해 보내므로(EmailAuthError) 그대로 보여준다.
 */
import type { CSSProperties, MouseEvent } from 'react';
import type { EmailAuthNotice, EmailSignupRequest, SignupTermsDocument } from '@o4o/auth-client';

/** 이 UI 가 요구하는 authClient 표면(@o4o/auth-client 인스턴스가 충족). */
export interface EmailAuthApi {
  getSignupTerms(): Promise<SignupTermsDocument>;
  signupWithEmail(request: EmailSignupRequest): Promise<EmailAuthNotice>;
  verifyEmail(token: string): Promise<EmailAuthNotice>;
  resendVerificationEmail(email: string): Promise<EmailAuthNotice>;
  requestPasswordReset(email: string): Promise<EmailAuthNotice>;
  resetPassword(token: string, newPassword: string): Promise<EmailAuthNotice>;
  findLoginId(name: string, phone: string): Promise<EmailAuthNotice>;
}

/** 화면 간 이동 링크. `onNavigate` 가 있으면 SPA 이동(기본 동작 취소), 없으면 일반 링크. */
export interface EmailAuthLinks {
  login?: string;
  signup?: string;
  findId?: string;
  forgotPassword?: string;
  onNavigate?: (href: string) => void;
}

export interface EmailAuthErrorInfo {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  status?: number;
}

/** axios 오류 → 사용자 문구. 서버 문구가 있으면 그것, 없으면 상황별 기본 문구. */
export function readEmailAuthError(error: unknown, fallback: string): EmailAuthErrorInfo {
  const e = error as { response?: { status?: number; data?: any }; code?: string };
  const data = e?.response?.data;
  const status = e?.response?.status;
  if (status === 429) {
    return { message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', code: data?.code, status };
  }
  if (data && typeof data === 'object') {
    const message = typeof data.error === 'string' && data.error ? data.error : fallback;
    return { message, code: typeof data.code === 'string' ? data.code : undefined, details: data.details, status };
  }
  if (error instanceof TypeError || e?.code === 'ERR_NETWORK') {
    return { message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' };
  }
  return { message: fallback };
}

export function linkHandler(links: EmailAuthLinks | undefined, href: string | undefined) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href || !links?.onNavigate) return;
    event.preventDefault();
    links.onNavigate(href);
  };
}

export const styles = {
  box: { display: 'flex', flexDirection: 'column', gap: 12 } as CSSProperties,
  field: { display: 'flex', flexDirection: 'column', gap: 4 } as CSSProperties,
  label: { fontSize: 14, fontWeight: 600, color: '#374151' } as CSSProperties,
  input: {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 15, background: '#fff', color: '#111827',
  } as CSSProperties,
  inputInvalid: { borderColor: '#dc2626' } as CSSProperties,
  hint: { fontSize: 12, color: '#6b7280', margin: 0 } as CSSProperties,
  hintOk: { fontSize: 12, color: '#15803d', margin: 0 } as CSSProperties,
  hintBad: { fontSize: 12, color: '#b91c1c', margin: 0 } as CSSProperties,
  error: {
    fontSize: 13, color: '#b91c1c', margin: 0, padding: '8px 12px',
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
  } as CSSProperties,
  notice: {
    fontSize: 14, color: '#1f2937', margin: 0, padding: '12px 14px',
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
  } as CSSProperties,
  muted: { fontSize: 13, color: '#6b7280', textAlign: 'center', margin: 0 } as CSSProperties,
  primaryBtn: {
    width: '100%', padding: '11px 14px', borderRadius: 8, border: 'none',
    background: '#111827', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer',
  } as CSSProperties,
  ghostBtn: {
    width: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db',
    background: 'transparent', color: '#374151', cursor: 'pointer', fontSize: 14,
  } as CSSProperties,
  linkRow: { display: 'flex', justifyContent: 'center', gap: 8, fontSize: 13, color: '#6b7280' } as CSSProperties,
  link: { color: '#374151', textDecoration: 'underline', cursor: 'pointer' } as CSSProperties,
  checkRow: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 } as CSSProperties,
};
