import { EmailLoginForm, type EmailLoginFormProps } from './email/EmailLoginForm';
import type { ReactNode } from 'react';

export function EmailLoginOption({ children }: { children: ReactNode }) {
  return (
    <details className="o4o-login-email-option" data-testid="email-login-option">
      <summary>이메일로 로그인</summary>
      <div className="o4o-login-email-content">{children}</div>
    </details>
  );
}

/** 이메일 수단은 소셜 버튼 아래에서 선택한다. 폼 상태·오류·복구 링크는 기존 폼이 관리한다. */
export function EmailLoginDisclosure<TUser>(props: EmailLoginFormProps<TUser>) {
  return (
    <EmailLoginOption><EmailLoginForm<TUser> {...props} /></EmailLoginOption>
  );
}
